export function showConfirmModal({ title, message, riskNote, suppressLabel, onConfirm }) {
	let modal = document.getElementById('udemy-plus-confirm-modal');

	if (!modal) {
		insertConfirmModalHTML();
		modal = document.getElementById('udemy-plus-confirm-modal');
	}

	modal.style.display = 'flex';

	modal.querySelector('#confirm-title').innerText = title;
	modal.querySelector('#confirm-message').innerText = message;
	const riskEl = modal.querySelector('#confirm-risk-note');
	if (riskEl) {
		if (riskNote === undefined) {
			riskEl.style.display = 'block';
			riskEl.innerText =
				'Warning: This action is not officially recommended by Udemy. There are no known reports of bans for using this feature, but use it at your own risk.';
		} else if (riskNote) {
			riskEl.style.display = 'block';
			riskEl.innerText = riskNote;
		} else {
			riskEl.style.display = 'none';
			riskEl.innerText = '';
		}
	}
	const suppressWrap = modal.querySelector('#confirm-suppress-wrap');
	const suppressCheckbox = modal.querySelector('#confirm-suppress');
	const suppressLabelEl = modal.querySelector('#confirm-suppress-label');
	if (suppressWrap && suppressCheckbox && suppressLabelEl) {
		if (suppressLabel) {
			suppressWrap.style.display = 'block';
			suppressCheckbox.checked = false;
			suppressLabelEl.innerText = suppressLabel;
		} else {
			suppressWrap.style.display = 'none';
			suppressCheckbox.checked = false;
		}
	}

	const confirmBtn = modal.querySelector('#confirm-yes');
	const cancelBtn = modal.querySelector('#confirm-no');

	const closeModal = () => (modal.style.display = 'none');

	confirmBtn.onclick = () => {
		closeModal();
		if (typeof onConfirm === 'function') {
			onConfirm({ dontShowAgain: Boolean(suppressCheckbox?.checked) });
		}
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
          <div id="confirm-risk-note" class="alert alert-warning small mb-0"></div>
          <div id="confirm-suppress-wrap" class="form-check mt-3" style="display:none;">
            <input class="form-check-input" type="checkbox" id="confirm-suppress" />
            <label class="form-check-label small" for="confirm-suppress" id="confirm-suppress-label">Don't show again</label>
          </div>
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
