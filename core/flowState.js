'use strict';

/**
 * Global workflow state for the app core (not wired to UI).
 * @type {{
 *   currentStep: 'scan' | 'action' | 'confirm' | 'done',
 *   selectedItem: object | null,
 *   selectedJob: object | null,
 *   movementType: string | null,
 *   quantity: number,
 *   resetFlow: () => void,
 *   setItem: (item: object) => void,
 *   setJob: (job: object) => void,
 *   setMovement: (type: string | null) => void,
 *   setQuantity: (qty: number) => void,
 *   goToConfirm: () => boolean,
 *   completeFlow: () => void,
 * }}
 */
const flowState = {
  currentStep: 'scan',
  selectedItem: null,
  selectedJob: null,
  movementType: null,
  quantity: 0,

  resetFlow() {
    this.currentStep = 'scan';
    this.selectedItem = null;
    this.selectedJob = null;
    this.movementType = null;
    this.quantity = 0;
    console.log('Flow: reset to initial state (scan)');
  },

  setItem(item) {
    this.selectedItem = item;
    this.currentStep = 'action';
    console.log('Flow: item set, moved to action');
  },

  setJob(job) {
    this.selectedJob = job;
    console.log('Flow: job set');
  },

  setMovement(type) {
    this.movementType = type;
    console.log('Flow: movement type set', type);
  },

  setQuantity(qty) {
    const n = typeof qty === 'number' ? qty : Number(qty);
    this.quantity = Number.isFinite(n) ? n : 0;
    console.log('Flow: quantity set', this.quantity);
  },

  goToConfirm() {
    const hasItem = this.selectedItem != null;
    const hasJob = this.selectedJob != null;
    const hasMovement =
      this.movementType === 'IN' || this.movementType === 'OUT';
    const hasQty =
      typeof this.quantity === 'number' &&
      Number.isFinite(this.quantity) &&
      this.quantity > 0;

    if (!hasItem || !hasJob || !hasMovement || !hasQty) {
      console.log('Flow: cannot move to confirm (missing item, job, movement, or quantity)');
      return false;
    }

    this.currentStep = 'confirm';
    console.log('Flow: moved to confirm');
    return true;
  },

  completeFlow() {
    this.currentStep = 'done';
    console.log('Flow: moved to done');
  },
};

module.exports = flowState;
