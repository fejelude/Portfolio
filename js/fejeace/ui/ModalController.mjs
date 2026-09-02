export class ModalController {
  constructor(root = document) {
    this.root = root;
  }

  mount() {
    this.root.querySelectorAll("[data-open-dialog]").forEach((button) => {
      button.addEventListener("click", () => this.root.getElementById(button.dataset.openDialog)?.showModal());
    });
    this.root.querySelectorAll("[data-close-dialog]").forEach((button) => {
      button.addEventListener("click", () => button.closest("dialog")?.close());
    });
    this.root.querySelectorAll("dialog").forEach((dialog) => {
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
      });
    });
  }
}
