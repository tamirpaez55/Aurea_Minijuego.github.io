// Canvases
const canvasFondo = document.getElementById("canvasFondo");
const ctxFondo = canvasFondo.getContext("2d");

const canvasManiqui = document.getElementById("canvasManiqui");
const ctxManiqui = canvasManiqui.getContext("2d");

const canvasDibujo = document.getElementById("canvasDibujo");
const ctxDibujo = canvasDibujo.getContext("2d");

// Herramientas
let tool = "brush";
let painting = false;
let currentColor = document.getElementById("colorPicker").value;
let brushSize = document.getElementById("brushSize").value;

// Historial para undo (pa volver atras) (de momento solo funciona para lo que se dibuja y no para lo que se borra (goma y tacho)
let undoStack = [];
const maxUndo = 20;

// Textura
let brushTexture = null;
const texturePicker = document.getElementById("texturePicker");
texturePicker.addEventListener("change", e => {
  const val = e.target.value;
  if(val === "none") brushTexture = null;
  else {
    brushTexture = new Image();
    brushTexture.src = val;
  }
});

// Cargar imágenes
const fondoImg = new Image();
fondoImg.src = "fondo1.png";

const maniqui = new Image();
maniqui.src = "outfit.png";

// Variables para centrar maniqui
let maniquiWidth, maniquiHeight, maniquiX, maniquiY;

// Redimensionar
function resizeCanvas(){
  canvasFondo.width = window.innerWidth;
  canvasFondo.height = window.innerHeight;
  if(fondoImg.complete) ctxFondo.drawImage(fondoImg,0,0,canvasFondo.width,canvasFondo.height);

  const scale = Math.min(window.innerWidth / maniqui.width, window.innerHeight / maniqui.height) * 0.5;
  maniquiWidth = maniqui.width * scale;
  maniquiHeight = maniqui.height * scale;
  maniquiX = (window.innerWidth - maniquiWidth)/2;
  maniquiY = (window.innerHeight - maniquiHeight)/2;

  [canvasManiqui, canvasDibujo].forEach(c=>{
    c.width = maniquiWidth;
    c.height = maniquiHeight;
    c.style.left = maniquiX + "px";
    c.style.top = maniquiY + "px";
  });

  if(maniqui.complete) ctxManiqui.drawImage(maniqui,0,0,maniquiWidth,maniquiHeight);
}

[fondoImg, maniqui].forEach(img=>img.onload = resizeCanvas);
window.addEventListener("resize", resizeCanvas);

// Color y tamaño
document.getElementById("colorPicker").addEventListener("input", e=>currentColor=e.target.value);
document.getElementById("brushSize").addEventListener("input", e=>brushSize=e.target.value);

// Dibujo
let lastX = 0, lastY = 0;

canvasDibujo.addEventListener("mousedown", startDraw);
canvasDibujo.addEventListener("mouseup", stopDraw);
canvasDibujo.addEventListener("mouseout", stopDraw);
canvasDibujo.addEventListener("mousemove", draw);
canvasDibujo.addEventListener("touchstart", e=>startDraw(e.touches[0]));
canvasDibujo.addEventListener("touchmove", e=>{draw(e.touches[0]); e.preventDefault();});
canvasDibujo.addEventListener("touchend", ()=>{stopDraw(); saveState();});

function startDraw(e){
  painting=true;
  const rect = canvasDibujo.getBoundingClientRect();
  lastX = e.clientX - rect.left;
  lastY = e.clientY - rect.top;
  draw(e);
}

function stopDraw(){
  painting=false;
  ctxDibujo.beginPath();
  saveState();
}

function draw(e){
  if(!painting) return;
  const rect = canvasDibujo.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if(tool === "brush"){
    if(brushTexture && brushTexture.complete){
      const temp = document.createElement("canvas");
      temp.width = brushTexture.width;
      temp.height = brushTexture.height;
      const tctx = temp.getContext("2d");

      tctx.drawImage(brushTexture,0,0);
      tctx.globalCompositeOperation = "source-in";
      tctx.fillStyle = currentColor;
      tctx.fillRect(0,0,temp.width,temp.height);

      const step = brushSize / 2;
      const dx = x - lastX;
      const dy = y - lastY;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(dist/step,1);

      for(let i=0;i<steps;i++){
        const px = lastX + dx*(i/steps);
        const py = lastY + dy*(i/steps);
        ctxDibujo.drawImage(temp, px-brushSize/2, py-brushSize/2, brushSize, brushSize);
      }
    } else {
      ctxDibujo.strokeStyle = currentColor;
      ctxDibujo.lineWidth = brushSize;
      ctxDibujo.lineCap = "round";
      ctxDibujo.beginPath();
      ctxDibujo.moveTo(lastX,lastY);
      ctxDibujo.lineTo(x,y);
      ctxDibujo.stroke();
    }
  }

  if(tool === "eraser"){
    ctxDibujo.globalCompositeOperation = "destination-out";
    ctxDibujo.lineWidth = brushSize;
    ctxDibujo.lineCap = "round";
    ctxDibujo.beginPath();
    ctxDibujo.moveTo(lastX,lastY);
    ctxDibujo.lineTo(x,y);
    ctxDibujo.stroke();
    ctxDibujo.globalCompositeOperation = "source-over";
  }

  if(tool === "spray") spray(ctxDibujo,x,y,currentColor,brushSize);

  lastX = x;
  lastY = y;
}

function spray(ctx,x,y,color,size){
  ctx.fillStyle=color;
  const density = size*5;
  for(let i=0;i<density;i++){
    const angle=Math.random()*2*Math.PI;
    const radius=Math.random()*size;
    const offsetX=Math.cos(angle)*radius;
    const offsetY=Math.sin(angle)*radius;
    ctx.fillRect(x+offsetX,y+offsetY,1,1);
  }
}

function clearCanvas(){
  ctxDibujo.clearRect(0,0,canvasDibujo.width,canvasDibujo.height);
  undoStack = [];
}

// ---- Undo ----
function saveState(){
  if(undoStack.length >= maxUndo) undoStack.shift();
  undoStack.push(canvasDibujo.toDataURL());
}

function undo(){
  if(undoStack.length === 0) return;
  const lastState = undoStack.pop();
  const img = new Image();
  img.src = lastState;
  img.onload = ()=>{
    ctxDibujo.clearRect(0,0,canvasDibujo.width,canvasDibujo.height);
    ctxDibujo.drawImage(img,0,0,canvasDibujo.width,canvasDibujo.height);
  }
}

// ---- Extra ----
function downloadImage() {
  // Crear un canvas temporal con el tamaño del maniquí
  const mergedCanvas = document.createElement("canvas");
  const ctx = mergedCanvas.getContext("2d");

  mergedCanvas.width = maniquiWidth;
  mergedCanvas.height = maniquiHeight;

  // 1️⃣ Dibujar el maniquí
  if (maniqui.complete) {
    ctx.drawImage(maniqui, 0, 0, maniquiWidth, maniquiHeight);
  }

  // 2️⃣ Dibujar el canvas del usuario encima
  ctx.drawImage(canvasDibujo, 0, 0, maniquiWidth, maniquiHeight);

  // 3️⃣ Descargar la imagen final (sin fondo)
  const link = document.createElement("a");
  link.download = "dibujo_sin_fondo.png";
  link.href = mergedCanvas.toDataURL("image/png");
  link.click();
}



function toggleHelp(){
  alert("nancy");
}
