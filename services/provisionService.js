const { randomUUID } = require('crypto');
const path = require('path');
const axios          = require('axios');
const catalogModel   = require('../models/catalogModel');
const eventModel     = require('../models/eventModel');
const { createServiceFiles } = require('../generators/serviceGenerator');
const { validateService }    = require('./governanceService');
const { generatedDir } = require('../config/paths');
const fileStore = require('../utils/fileStore');
const slugify = require('../utils/slugify');

// Jenkins helpers 

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildJobXml(serviceName) {
  const jenkinsfile = fileStore.readText(path.join(generatedDir, serviceName, 'Jenkinsfile'));
  const script = escapeXml(jenkinsfile);

  return `<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job">
  <description>Auto-created by SK IDP for ${serviceName}</description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <hudson.model.ParametersDefinitionProperty>
      <parameterDefinitions>
        <hudson.model.ChoiceParameterDefinition>
          <name>DEPLOY_TARGET</name>
          <choices class="java.util.Arrays$ArrayList">
            <a class="string-array">
              <string>kind</string>
              <string>aws-ec2</string>
            </a>
          </choices>
          <description>kind = local cluster, aws-ec2 = Docker Hub plus EC2</description>
        </hudson.model.ChoiceParameterDefinition>
        <hudson.model.StringParameterDefinition>
          <name>IDP_URL</name>
          <defaultValue>http://localhost:3000</defaultValue>
          <description>IDP address for callback</description>
        </hudson.model.StringParameterDefinition>
      </parameterDefinitions>
    </hudson.model.ParametersDefinitionProperty>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition" plugin="workflow-cps">
    <script>${script}</script>
    <sandbox>true</sandbox>
  </definition>
  <disabled>false</disabled>
</flow-definition>`;
}

async function createOrUpdateJenkinsJob(serviceName) {
  const url   = process.env.JENKINS_URL   || '';
  const user  = process.env.JENKINS_USER  || 'admin';
  const token = process.env.JENKINS_TOKEN || '';

  if (!url || !token) {
    console.log('[jenkins] JENKINS_URL or JENKINS_TOKEN not set - skipping job creation');
    return;
  }

  const jobXml = buildJobXml(serviceName);

  try {
    await axios.post(
      `${url}/createItem?name=${encodeURIComponent(serviceName)}`,
      jobXml,
      {
        auth: { username: user, password: token },
        headers: { 'Content-Type': 'application/xml' }
      }
    );
    console.log(`[jenkins] Job created: ${serviceName}`);
  } catch (err) {
    if (err.response && err.response.status === 400) {
      try {
        await axios.post(
          `${url}/job/${encodeURIComponent(serviceName)}/config.xml`,
          jobXml,
          {
            auth: { username: user, password: token },
            headers: { 'Content-Type': 'application/xml' }
          }
        );
        console.log(`[jenkins] Job updated: ${serviceName}`);
      } catch (updateErr) {
        console.warn(`[jenkins] Job update failed: ${updateErr.message}`);
      }
    } else {
      console.warn(`[jenkins] Job creation failed: ${err.message}`);
    }
  }
}

async function triggerJenkinsBuild(service, deployTarget) {
  const url   = process.env.JENKINS_URL   || '';
  const user  = process.env.JENKINS_USER  || 'admin';
  const token = process.env.JENKINS_TOKEN || '';
  const idp   = process.env.IDP_URL       || 'http://localhost:3000';

  if (!url || !token) {
    console.log('[jenkins] JENKINS_URL or JENKINS_TOKEN not set - skipping build trigger');
    return;
  }

  const triggerUrl = `${url}/job/${encodeURIComponent(service.name)}/buildWithParameters`;

  try {
    await axios.post(triggerUrl, null, {
      auth: { username: user, password: token },
      params: {
        DEPLOY_TARGET: deployTarget,
        IDP_URL: idp
      }
    });
    console.log(`[jenkins] Build triggered: ${service.name} -> ${deployTarget}`);
  } catch (err) {
    console.warn(`[jenkins] Build trigger failed: ${err.message}`);
  }
}

// Provision 

function buildInput(body) {
  return {
    name:          slugify(body.name || ''),
    owner:         (body.owner || '').trim(),
    dockerHubUser: (body.dockerHubUser || '').trim(),
    template:      body.template,
    env:           body.env,
    replicas:      Number(body.replicas || 1),
    costCenter:    (body.costCenter || 'learning').trim()
  };
}

async function provision(body) {
  const input  = buildInput(body);
  const errors = validateService(input);
  if (errors.length) return { errors, values: body };

  const catalog = catalogModel.all();
  if (catalog.find(service => service.name === input.name)) {
    return { errors: ['Service already exists in catalog.'], values: body };
  }

  const nodePort = 31000 + catalog.length;
  const service  = {
    id:           randomUUID(),
    ...input,
    ownerLabel:   input.owner.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(),
    status:       'ready',
    createdAt:    new Date().toISOString(),
    gatewayPath:  `/api/${input.name}`,
    nodePort,
    publicUrl:    `http://localhost:${nodePort}`,
    awsUrl:       '',
    dockerImage:  `${input.dockerHubUser}/${input.name}:latest`,
    repoPath:     `generated-services/${input.name}`
  };

  createServiceFiles(service);
  catalogModel.add(service);
  eventModel.add('provision', `Created ${service.name}`, { owner: service.owner, env: service.env });

  // Auto-trigger Jenkins pipeline. Default to AWS EC2 so new services complete the
  // Docker Hub + Terraform deployment path unless overridden in .env.
  const deployTarget = process.env.AUTO_DEPLOY_TARGET || 'aws-ec2';
  await createOrUpdateJenkinsJob(service.name);
  await new Promise(r => setTimeout(r, 2000)); 
  await triggerJenkinsBuild(service, deployTarget);

  return { service };
}

module.exports = { provision, createOrUpdateJenkinsJob, triggerJenkinsBuild };
