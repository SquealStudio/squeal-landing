const canvas = document.getElementById('blob-canvas');
const ctx = canvas.getContext('2d');
let W, H, DPR;
let particles = [];

// Logo: 18 hexagons. Each entry is [x, y, bright] where (x, y) is the top vertex
// of a pointy-top hexagon in a 504x449 viewBox; bright=1 is a white hexagon.
const LOGO_W = 504, LOGO_H = 449;
const HEX_HW = 48.497, HEX_Q1 = 27.75, HEX_Q3 = 83.25, HEX_H = 111;
const HEXES = [
    [350,338,0],
    [399,254,0],
    [301,254,0],
    [203,254,0],
    [252,169,0],
    [203,84,0],
    [105,84,0],
    [56,0,0],
    [301,84,0],
    [350,169,1],
    [252,338,1],
    [154,169,1],
    [56,169,1],
    [448,169,1],
    [399,84,0],
    [448,0,0],
    [154,338,0],
    [105,254,0]
];

function hexVerts(x, y){
    return [[x,y],[x+HEX_HW,y+HEX_Q1],[x+HEX_HW,y+HEX_Q3],[x,y+HEX_H],[x-HEX_HW,y+HEX_Q3],[x-HEX_HW,y+HEX_Q1]];
}

function pointInHex(px, py, x, y){
    // convex polygon test
    const v = hexVerts(x, y);
    for (let i=0;i<6;i++){
        const a = v[i], b = v[(i+1)%6];
        if ((b[0]-a[0])*(py-a[1]) - (b[1]-a[1])*(px-a[0]) < 0) return false;
    }
    return true;
}

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
    const count = window.innerWidth < 767 ? 2400 : 5200;
    const scale = Math.min(W / LOGO_W, H / LOGO_H) * 0.94;
    const offX = (W - LOGO_W * scale) / 2;
    const offY = (H - LOGO_H * scale) / 2;
    const perHex = Math.round(count / HEXES.length);

    HEXES.forEach(([hx, hy, bright]) => {
        const v = hexVerts(hx, hy);
        const n = bright ? Math.round(perHex * 1.25) : perHex;
        for (let i=0;i<n;i++){
            let lx, ly, isEdge = false;
            if (Math.random() < 0.28){
                // dense rim so each hexagon keeps a crisp outline
                const k = Math.floor(Math.random()*6);
                const a = v[k], b = v[(k+1)%6];
                const t = Math.random();
                const cx = hx, cy = hy + HEX_H/2;
                const inset = Math.random() * 0.07;
                lx = a[0] + (b[0]-a[0])*t; ly = a[1] + (b[1]-a[1])*t;
                lx += (cx - lx) * inset; ly += (cy - ly) * inset;
                isEdge = true;
            } else {
                do {
                    lx = hx - HEX_HW + Math.random()*HEX_HW*2;
                    ly = hy + Math.random()*HEX_H;
                } while (!pointInHex(lx, ly, hx, hy));
            }
            const px = offX + lx * scale;
            const py = offY + ly * scale;
            particles.push({
                baseX: px, baseY: py,
                x: px, y: py,
                seed: Math.random()*1000,
                speed: 0.4 + Math.random()*0.6,
                size: isEdge ? (1.5+Math.random()*1.2) : (1.1+Math.random()*0.9),
                bright: !!bright,
                edge: isEdge
            });
        }
    });
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
        const wobbleX = Math.sin(t*p.speed + p.seed) * 2.2;
        const wobbleY = Math.cos(t*p.speed*0.8 + p.seed*1.3) * 2.2;

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
        if (p.bright){
            ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
        } else {
            // dark hexagons (#282828) are lifted to grey so particles stay visible on the dark page
            const a = alpha * (p.edge ? 0.55 : 0.4);
            ctx.fillStyle = `rgba(150,150,150,${a.toFixed(2)})`;
        }
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
