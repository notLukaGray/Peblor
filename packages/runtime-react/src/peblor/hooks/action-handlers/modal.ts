import type { ActionHandler, ActionHandlerMap } from "./types";

const handleModalOpen: ActionHandler = (payload) => {
  const { id } = (payload ?? {}) as { id?: string };
  window.dispatchEvent(
    new CustomEvent("peblor-modal", {
      detail: { type: "modalOpen", id },
    })
  );
};

const handleModalClose: ActionHandler = (payload) => {
  const { id } = (payload ?? {}) as { id?: string };
  window.dispatchEvent(
    new CustomEvent("peblor-modal", {
      detail: { type: "modalClose", id },
    })
  );
};

const handleModalToggle: ActionHandler = (payload) => {
  const { id } = (payload ?? {}) as { id?: string };
  window.dispatchEvent(
    new CustomEvent("peblor-modal", {
      detail: { type: "modalToggle", id },
    })
  );
};

export const MODAL_HANDLERS: ActionHandlerMap = {
  modalOpen: handleModalOpen,
  modalClose: handleModalClose,
  modalToggle: handleModalToggle,
};
