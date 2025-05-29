export function showConfirmModal({ title, message, onConfirm }) {
	let modal = document.getElementById('udemy-plus-confirm-modal');

	if (!modal) {
		insertConfirmModalHTML();
		modal = document.getElementById('udemy-plus-confirm-modal');
	}

	modal.style.display = 'flex';

	modal.querySelector('#confirm-title').innerText = title;
	modal.querySelector('#confirm-message').innerText = message;

	const confirmBtn = modal.querySelector('#confirm-yes');
	const cancelBtn = modal.querySelector('#confirm-no');

	const closeModal = () => (modal.style.display = 'none');

	confirmBtn.onclick = () => {
		closeModal();
		if (typeof onConfirm === 'function') onConfirm();
	};

	cancelBtn.onclick = closeModal;

	modal.onclick = e => {
		if (e.target === modal) closeModal();
	};
}

export function insertConfirmModalHTML() {
	const confirmModal = document.createElement('div');
	confirmModal.id = 'udemy-plus-confirm-modal';
	confirmModal.className = 'udemy-plus-confirm-modal modal fade show';
	confirmModal.tabIndex = -1;
	confirmModal.setAttribute('role', 'dialog');

	confirmModal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered" style="z-index: 9999;">
      <div class="modal-content" style="font-family: 'Poppins', sans-serif;">
        <div class="modal-header bg-dark text-white">
          <h5 class="modal-title" id="confirm-title">Confirm Action</h5>
        </div>
        <div class="modal-body">
          <p id="confirm-message">Are you sure you want to proceed?</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-danger fs-5 px-4" id="confirm-no">Cancel</button>
          <button type="button" class="btn btn-success fs-5 px-4" id="confirm-yes">Yes</button>
        </div>
      </div>
    </div>
  `;

	document.body.appendChild(confirmModal);
}
