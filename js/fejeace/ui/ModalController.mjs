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
      dialog.addEventListener("close", () => this.afterClose(dialog));
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) this.close(dialog);
      });
    });
  }

  open(dialog) {
    if (!dialog) return;
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
      document.body.classList.add("dialog-open");
    }
    else {
      dialog.setAttribute("open", "");
      dialog.classList.add("dialog-fallback-open");
      document.body.classList.add("dialog-open");
    }
  }

  close(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
    dialog.classList.remove("dialog-fallback-open");
    this.afterClose(dialog);
  }

  afterClose(dialog) {
    dialog?.classList.remove("dialog-fallback-open");
    if (![...this.root.querySelectorAll("dialog")].some((item) => item.open)) {
      document.body.classList.remove("dialog-open");
    }
  }
}
