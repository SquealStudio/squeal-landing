const canvas = document.getElementById('blob-canvas');
const ctx = canvas.getContext('2d');
let W, H, DPR;
let particles = [];

function resize(){
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR,0,0,DPR,0,0);
    buildParticles();
}

function buildParticles(){
    particles = [];
    const cx = W/2, cy = H/2;
    const count = window.innerWidth < 767 ? 1600 : 3200;

    const svgNS = "http://www.w3.org/2000/svg";
    const tempSvg = document.createElementNS(svgNS, "svg");
    const tempPath = document.createElementNS(svgNS, "path");
    tempPath.setAttribute("d", `
    M 84,38
    C 84,26 74,20 60,20
    C 46,20 36,26 36,38
    C 36,52 52,54 52,62
    C 52,68 44,72 36,72
    M 36,82
    C 36,94 46,100 60,100
    C 74,100 84,94 84,82
    C 84,68 68,66 68,58
    C 68,52 76,48 84,48
    `);
    tempSvg.appendChild(tempPath);
    tempSvg.style.position = "absolute";
    tempSvg.style.width = "0"; tempSvg.style.height = "0"; tempSvg.style.overflow = "hidden";
    document.body.appendChild(tempSvg);

    const totalLen = tempPath.getTotalLength();
    const strokeHalf = 7;
    const logoScale = (Math.min(W,H) * 0.82) / 120;
    const offsetX = 60, offsetY = 60;

    for(let i=0;i<count;i++){
        const len = Math.random() * totalLen;
        const pt = tempPath.getPointAtLength(len);
        const jitter = (Math.random()-0.5) * strokeHalf * 1.7;
        const lenB = Math.min(totalLen, Math.max(0, len + 0.6));
        const ptB = tempPath.getPointAtLength(lenB);
        const dx = ptB.x - pt.x, dy = ptB.y - pt.y;
        const dLen = Math.sqrt(dx*dx+dy*dy) || 1;
        const nx = -dy/dLen, ny = dx/dLen;

        const localX = pt.x + nx*jitter - offsetX;
        const localY = pt.y + ny*jitter - offsetY;

        const px = cx + localX * logoScale;
        const py = cy + localY * logoScale;

        const isEdge = Math.abs(jitter) > strokeHalf*0.55;

        particles.push({
            baseX: px, baseY: py,
            x: px, y: py,
            seed: Math.random()*1000,
                       speed: 0.4 + Math.random()*0.6,
                       size: isEdge ? (1.6+Math.random()*1.3) : (1.2+Math.random()*0.9),
                       warm: Math.random() < (isEdge ? 0.5 : 0.2)
        });
    }

    document.body.removeChild(tempSvg);
}

let mouseX = -9999, mouseY = -9999;
window.addEventListener('mousemove', (e)=>{
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});
window.addEventListener('mouseleave', ()=>{ mouseX=-9999; mouseY=-9999; });

let t = 0;
function draw(){
    if (window.innerWidth <= 900) {
        requestAnimationFrame(draw);
        return;
    }

    t += 0.012;
    ctx.clearRect(0,0,W,H);

    particles.forEach(p=>{
        const wobbleX = Math.sin(t*p.speed + p.seed) * 3;
        const wobbleY = Math.cos(t*p.speed*0.8 + p.seed*1.3) * 3;

        const dx = p.baseX - mouseX, dy = p.baseY - mouseY;
        const dist = Math.sqrt(dx*dx+dy*dy);
        const push = Math.max(0, 1 - dist/140) * 14;
        const angle = Math.atan2(dy,dx);

        const rawX = p.baseX + wobbleX + Math.cos(angle)*push;
        const rawY = p.baseY + wobbleY + Math.sin(angle)*push;

        const x = (Math.round(rawX * DPR) + 0.5) / DPR;
        const y = (Math.round(rawY * DPR) + 0.5) / DPR;

        const shimmer = 0.5 + 0.5*Math.sin(t*p.speed*1.5 + p.seed);
        const alpha = 0.45 + shimmer*0.55;

        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI*2);
        ctx.fillStyle = p.warm
        ? `rgba(0,242,254,${alpha.toFixed(2)})`
        : `rgba(79,172,254,${(alpha*0.85).toFixed(2)})`;
        ctx.fill();
    });

    requestAnimationFrame(draw);
}

window.addEventListener('resize', resize);
resize();
draw();

const io = new IntersectionObserver((entries)=>{
    entries.forEach(en=>{
        if(en.isIntersecting){ en.target.classList.add('visible'); io.unobserve(en.target); }
    });
}, {threshold:0.15});
document.querySelectorAll('.fade-up').forEach(el=>io.observe(el));

const runBtn = document.getElementById('runBtn');
const outputLine = document.getElementById('outputLine');
const promptInput = document.getElementById('promptInput');
const termStatus = document.getElementById('termStatus');

const MODEL_ID = 'Squeal-Studio/squeal_ai_20m-instruct';

let generatorPromise = null;
let isBusy = false;

function setStatus(dotClass, text){
    termStatus.innerHTML = `<span class="${dotClass}">●</span> ${text}`;
}

async function getGenerator(){
    if (generatorPromise) return generatorPromise;

    setStatus('signal', 'loading model weights (onnx, int8, ~20MB)…');

    generatorPromise = import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0')
    .then(({ pipeline }) => pipeline('text-generation', MODEL_ID, {
        dtype: 'q8',
        progress_callback: (p) => {
            if (p.status === 'progress' && p.file && p.file.endsWith('.onnx')) {
                const pct = p.total ? Math.round((p.loaded / p.total) * 100) : null;
                setStatus('signal', `downloading ${p.file}${pct !== null ? ' — ' + pct + '%' : ''}…`);
            }
        }
    }))
    .then((gen) => {
        setStatus('violet', 'model ready');
        return gen;
    })
    .catch((err) => {
        generatorPromise = null;
        setStatus('signal', `failed to load model: ${err.message || err}`);
        throw err;
    });

    return generatorPromise;
}

async function runInference(){
    if (isBusy) return;
    const prompt = promptInput.value.trim();
    if (!prompt){
        setStatus('signal', 'type a prompt first');
        return;
    }

    isBusy = true;
    runBtn.disabled = true;
    outputLine.innerHTML = '<span class="blink">▍</span>';

    try{
        const generator = await getGenerator();
        setStatus('violet', 'generating…');

        const formattedPrompt = `User: ${prompt}\nBot:`;

        const result = await generator(formattedPrompt, {
            max_new_tokens: 120,
            repetition_penalty: 1.2,
            no_repeat_ngram_size: 3,
            temperature: 0.7,
            do_sample: true
        });

        const fullText = result[0].generated_text;
        const reply = fullText.split('Bot:').pop().trim();

        outputLine.textContent = reply || '(empty response)';
        setStatus('violet', 'done');
    } catch(err){
        outputLine.innerHTML = `<span class="dim">error: ${(err.message || err)}</span>`;
    } finally{
        isBusy = false;
        runBtn.disabled = false;
    }
}

runBtn.addEventListener('click', runInference);
promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey){
        e.preventDefault();
        runInference();
    }
});
