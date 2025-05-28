(function () {
  console.log("UdemyPlus injetado!");

  const observer = new MutationObserver(() => {
    if (!document.querySelector('#udemy-plus-panel') && document.querySelector('.udlite-main-content')) {
      const panel = document.createElement('div');
      panel.id = 'udemy-plus-panel';
      panel.innerHTML = "<strong>Progresso e ferramentas UdemyPlus aqui.</strong>";
      panel.style = "padding: 1rem; background: #f3f3f3; border: 1px solid #ccc; margin: 1rem 0;";
      document.querySelector('.udlite-main-content').prepend(panel);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();