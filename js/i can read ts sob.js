document.addEventListener("click", (e) => {
  const box = e.target.closest(".weao-_648aec");
  if (!box) return;

  box.classList.toggle("weao-_ef563d");
});
