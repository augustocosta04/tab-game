// js/sticks.js
// Dado de paus (4 paus com duas faces) com animação de queda.

export class Sticks {
  constructor(viewEl, outputEl) {
    this.viewEl = viewEl;
    this.outputEl = outputEl;

    this.stickEls = Array.from(this.viewEl.querySelectorAll(".stick"));
    
    // Canvas para animação
    this.canvas = this.viewEl.querySelector("#sticks-canvas");
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
    
    this.lastFaces = ["desconhecida", "desconhecida", "desconhecida", "desconhecida"];
    this.lastValue = null;
    this.repeatTurn = false;
    this.animating = false;
    this.stickStates = [];
  }

  reset() {
    this.lastFaces = ["desconhecida", "desconhecida", "desconhecida", "desconhecida"];
    this.lastValue = null;
    this.repeatTurn = false;
    this.animating = false;
    this._renderFaces();
    this._renderValue("–");
    this._clearCanvas();
  }

  roll() {
    this.lastFaces = Array.from({ length: 4 }, () =>
      Math.random() < 0.5 ? "clara" : "escura"
    );

    const claras = this.lastFaces.filter((f) => f === "clara").length;
    const value = claras === 0 ? 6 : claras;
    const repeat = value === 1 || value === 4 || value === 6;

    this.lastValue = value;
    this.repeatTurn = repeat;

    this._animateFalling(() => {
      this._renderFaces();
      this._renderValue(String(value));
    });

    return { value, repeat, faces: [...this.lastFaces] };
  }
  
  setFromServer(stickValues, value, keepPlaying, animate = true) {
    this.lastFaces = stickValues.map(v => v ? "clara" : "escura");
    this.lastValue = value;
    this.repeatTurn = keepPlaying;
    
    if (animate && this.ctx) {
      this._animateFalling(() => {
        this._renderFaces();
        this._renderValue(String(value));
      });
    } else {
      this._renderFaces();
      this._renderValue(String(value));
    }
  }

  getResult() {
    if (this.lastValue == null) return null;
    return { value: this.lastValue, repeat: this.repeatTurn, faces: [...this.lastFaces] };
  }

  _renderFaces() {
    this.stickEls.forEach((el, i) => {
      const face = this.lastFaces[i] ?? "desconhecida";
      el.setAttribute("data-face", face);
    });
    this._clearCanvas();
  }

  _renderValue(text) {
    if (this.outputEl) this.outputEl.textContent = text;
  }
  
  _clearCanvas() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  _animateFalling(callback) {
    if (!this.ctx || this.animating) {
      callback();
      return;
    }
    
    this.animating = true;
    const ctx = this.ctx;
    const canvas = this.canvas;
    
    // Esconder elementos DOM durante animação
    this.stickEls.forEach(el => el.style.opacity = "0");
    
    // Configurações físicas - MAIS LENTO
    const gravity = 0.25;  // Reduzido de 0.5
    const groundY = canvas.height - 10;
    const stickLength = 50;  // Reduzido de 65
    const stickWidth = 8;    // Reduzido de 10
    
    // Inicializar estado - paus começam juntos no topo centro
    this.stickStates = [];
    for (let i = 0; i < 4; i++) {
      const startX = canvas.width / 2 + (i - 1.5) * 3;
      const startY = -20;
      
      // Dispersão ao cair - mais suave
      const spreadAngle = (i - 1.5) * 0.35 + (Math.random() - 0.5) * 0.2;
      const initialSpeed = 1 + Math.random() * 1;  // Reduzido
      
      this.stickStates.push({
        x: startX,
        y: startY,
        vx: Math.sin(spreadAngle) * initialSpeed * 1.5,
        vy: Math.random() * 1,
        angle: (Math.random() - 0.5) * Math.PI * 0.3,
        angularVel: (Math.random() - 0.5) * 0.12,  // Reduzido
        landed: false,
        bounces: 0
      });
    }
    
    const self = this;
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let allLanded = true;
      
      for (let i = 0; i < 4; i++) {
        const stick = self.stickStates[i];
        
        if (!stick.landed) {
          // Gravidade
          stick.vy += gravity;
          
          // Movimento
          stick.x += stick.vx;
          stick.y += stick.vy;
          stick.angle += stick.angularVel;
          
          // Fricção
          stick.vx *= 0.997;
          stick.angularVel *= 0.98;
          
          // Chão
          if (stick.y >= groundY) {
            stick.y = groundY;
            
            if (stick.bounces < 2 && Math.abs(stick.vy) > 2) {
              stick.vy *= -0.3;
              stick.vx *= 0.6;
              stick.angularVel = (Math.random() - 0.5) * 0.1;
              stick.bounces++;
            } else {
              stick.vy = 0;
              stick.vx *= 0.2;
              
              if (Math.abs(stick.vx) < 0.15 && Math.abs(stick.angularVel) < 0.015) {
                stick.landed = true;
                stick.angle = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
              }
            }
          }
          
          // Paredes
          if (stick.x < 20) {
            stick.x = 20;
            stick.vx *= -0.4;
          }
          if (stick.x > canvas.width - 20) {
            stick.x = canvas.width - 20;
            stick.vx *= -0.4;
          }
          
          allLanded = false;
        }
        
        // Desenhar
        self._drawStick(ctx, stick, i, stickLength, stickWidth);
      }
      
      if (!allLanded) {
        requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          self.animating = false;
          self.stickEls.forEach(el => el.style.opacity = "1");
          self._clearCanvas();
          callback();
        }, 200);
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  _drawStick(ctx, stick, index, length, width) {
    const isClara = this.lastFaces[index] === "clara";
    
    ctx.save();
    ctx.translate(stick.x, stick.y);
    ctx.rotate(stick.angle);
    
    // Sombra
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.beginPath();
    ctx.ellipse(2, 2, length / 2 - 2, width / 2, stick.angle, 0, Math.PI * 2);
    ctx.fill();
    
    // Gradiente do pau
    const gradient = ctx.createLinearGradient(0, -width, 0, width);
    
    if (stick.landed) {
      if (isClara) {
        gradient.addColorStop(0, "#d4b896");
        gradient.addColorStop(0.3, "#f5e6c8");
        gradient.addColorStop(0.5, "#fff8e7");
        gradient.addColorStop(0.7, "#f5e6c8");
        gradient.addColorStop(1, "#c4a876");
      } else {
        gradient.addColorStop(0, "#2d1810");
        gradient.addColorStop(0.3, "#4a2a1a");
        gradient.addColorStop(0.5, "#5c3825");
        gradient.addColorStop(0.7, "#4a2a1a");
        gradient.addColorStop(1, "#2d1810");
      }
    } else {
      gradient.addColorStop(0, "#7a5c3a");
      gradient.addColorStop(0.5, "#a08050");
      gradient.addColorStop(1, "#7a5c3a");
    }
    
    ctx.fillStyle = gradient;
    
    // Desenhar pau
    const hw = length / 2;
    const hh = width / 2;
    const r = hh;
    
    ctx.beginPath();
    ctx.moveTo(-hw + r, -hh);
    ctx.lineTo(hw - r, -hh);
    ctx.arc(hw - r, 0, hh, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(-hw + r, hh);
    ctx.arc(-hw + r, 0, hh, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
    ctx.fill();
    
    // Borda
    ctx.strokeStyle = "#1a0f08";
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Detalhes
    if (stick.landed) {
      if (isClara) {
        ctx.strokeStyle = "rgba(139, 90, 43, 0.3)";
        ctx.lineWidth = 1;
        for (let j = 0; j < 2; j++) {
          const xPos = -hw / 2 + j * hw;
          ctx.beginPath();
          ctx.moveTo(xPos, -hh + 2);
          ctx.lineTo(xPos, hh - 2);
          ctx.stroke();
        }
      } else {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-hw + 8, 0);
        ctx.lineTo(hw - 8, 0);
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }
}
