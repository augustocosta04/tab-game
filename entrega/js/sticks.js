// js/sticks.js
// Dado de paus (4 paus com duas faces). Orientado a objetos.

/**
 * faces possíveis de cada pau:
 *  - "clara" (plana)   -> conta 1
 *  - "escura" (arredondada) -> conta 0
 *  - "desconhecida" (estado inicial)
 *
 * valor do lançamento:
 *  - soma de "claras" ∈ {0,1,2,3,4}
 *  - se soma === 0 -> valor = 6 (Sit-teh)  [repete]
 *  - caso contrário -> valor = soma
 *  - repete se valor ∈ {1,4,6}
 */

export class Sticks {
  /**
   * @param {HTMLElement} viewEl   contêiner com as 4 .stick (ex: #dado .sticks-view)
   * @param {HTMLOutputElement} outputEl  <output id="valor-dado">
   */
  constructor(viewEl, outputEl) {
    this.viewEl = viewEl;
    this.outputEl = outputEl;

    this.stickEls = Array.from(this.viewEl.querySelectorAll(".stick"));
    if (this.stickEls.length !== 4) {
      console.warn("Esperava 4 elementos .stick dentro de sticks-view.");
    }

    this.lastFaces = ["desconhecida", "desconhecida", "desconhecida", "desconhecida"];
    this.lastValue = null;
    this.repeatTurn = false;
  }

  /** Deixa o dado “virgem” (como pede o enunciado no fim de cada jogada) */
  reset() {
    this.lastFaces = ["desconhecida", "desconhecida", "desconhecida", "desconhecida"];
    this.lastValue = null;
    this.repeatTurn = false;
    this.#renderFaces();
    this.#renderValue("–");
  }

  /** Rola os paus, calcula valor e atualiza UI */
  roll() {
    // Sorteia 4 faces (50/50). Se quiser, pode variar a probabilidade por face mais tarde.
    this.lastFaces = Array.from({ length: 4 }, () =>
      Math.random() < 0.5 ? "clara" : "escura"
    );

    const claras = this.lastFaces.filter((f) => f === "clara").length;
    const value = claras === 0 ? 6 : claras;
    const repeat = value === 1 || value === 4 || value === 6;

    this.lastValue = value;
    this.repeatTurn = repeat;

    this.#renderFaces();
    this.#renderValue(String(value));

    return { value, repeat, faces: [...this.lastFaces] };
  }

  /** devolve o último resultado (ou null se ainda não rolou) */
  getResult() {
    if (this.lastValue == null) return null;
    return { value: this.lastValue, repeat: this.repeatTurn, faces: [...this.lastFaces] };
  }

  // --- privados -------------------------------------------------------------

  #renderFaces() {
    this.stickEls.forEach((el, i) => {
      const face = this.lastFaces[i] ?? "desconhecida";
      el.setAttribute("data-face", face);
    });
  }

  #renderValue(text) {
    if (this.outputEl) this.outputEl.textContent = text;
  }
}
