export class ModalController {
  constructor(root = document) {
    this.root = root;
  }

  mount() {
    this.root.querySelectorAll("[data-open-dialog]").forEach((button) => {
      button.addEventListener("click", () => this.open(this.root.getElementById(button.dataset.openDialog)));
    });
    this.root.querySelectorAll("[data-close-dialog]").forEach((button) => {
      button.addEventListener("click", () => this.close(button.closest("dialog")));
    });
    this.root.querySelectorAll("dialog").forEach((dialog) => {
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) this.close(dialog);
      });
    });
  }

  open(dialog) {
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else {
      dialog.setAttribute("open", "");
      dialog.classList.add("dialog-fallback-open");
      document.body.classList.add("dialog-open");
    }
  }

  close(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
    dialog.classList.remove("dialog-fallback-open");
    if (!this.root.querySelector("dialog.dialog-fallback-open")) document.body.classList.remove("dialog-open");
  }
}
