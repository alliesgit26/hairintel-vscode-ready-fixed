
document.querySelectorAll('.tabs button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

document.querySelectorAll('.map-tabs button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.map-tabs button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

document.querySelector('.back')?.addEventListener('click', () => {
  window.location.href = 'index.html';
});
