document.querySelectorAll('input[name="name"]').forEach(input => {
  input.addEventListener('blur', () => {
    input.value = input.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  });
});
