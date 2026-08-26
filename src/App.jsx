import { useEffect, useRef, useState } from "react";

const colors = ["#1d252c", "#e85d3f", "#e4a72c", "#2f8f83", "#4d78c9"];

export default function App() {
    const canvasRef = useRef(null);
    const drawingRef = useRef(false);
    const lastPointRef = useRef(null);
    const historyRef = useRef([]);
    const [tool, setTool] = useState("pen");
    const [color, setColor] = useState(colors[0]);
    const previousThemeRef = useRef(null);
    const [size, setSize] = useState(5);
    const [strokes, setStrokes] = useState(0);
    const [darkMode, setDarkMode] = useState(() => window.localStorage.getItem("whiteboard-theme") === "dark");

    useEffect(() => {
        window.localStorage.setItem("whiteboard-theme", darkMode ? "dark" : "light");
    }, [darkMode]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        const resizeCanvas = () => {
            const snapshot = canvas.width > 0 ? canvas.toDataURL() : null;
            const bounds = canvas.getBoundingClientRect();
            const ratio = window.devicePixelRatio || 1;
            canvas.width = bounds.width * ratio;
            canvas.height = bounds.height * ratio;
            context.scale(ratio, ratio);
            context.clearRect(0, 0, bounds.width, bounds.height);
            historyRef.current = [];
            if (snapshot) {
                const image = new Image();
                image.onload = () => context.drawImage(image, 0, 0, bounds.width, bounds.height);
                image.src = snapshot;
            }
        };
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        return () => window.removeEventListener("resize", resizeCanvas);
    }, []);

    useEffect(() => {
        if (previousThemeRef.current === null) {
            previousThemeRef.current = darkMode;
            return;
        }
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        const oldInk = darkMode ? [29, 37, 44] : [244, 241, 233];
        const newInk = darkMode ? [244, 241, 233] : [29, 37, 44];
        for (let index = 0; index < pixels.length; index += 4) {
            if (Math.abs(pixels[index] - oldInk[0]) < 8 && Math.abs(pixels[index + 1] - oldInk[1]) < 8 && Math.abs(pixels[index + 2] - oldInk[2]) < 8) {
                pixels[index] = newInk[0];
                pixels[index + 1] = newInk[1];
                pixels[index + 2] = newInk[2];
            }
        }
        context.putImageData(imageData, 0, 0);
        previousThemeRef.current = darkMode;
    }, [darkMode]);

    useEffect(() => {
        if (!darkMode) return;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        for (let index = 0; index < pixels.length; index += 4) {
            if (pixels[index] > 245 && pixels[index + 1] > 245 && pixels[index + 2] > 240) pixels[index + 3] = 0;
        }
        context.putImageData(imageData, 0, 0);
    }, [darkMode]);

    const getPoint = (event) => {
        const bounds = canvasRef.current.getBoundingClientRect();
        return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    };

    const startDrawing = (event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        const canvas = canvasRef.current;
        historyRef.current.push({
            imageData: canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height),
            strokes
        });
        drawingRef.current = true;
        lastPointRef.current = getPoint(event);
    };

    const draw = (event) => {
        if (!drawingRef.current) return;
        const context = canvasRef.current.getContext("2d");
        const point = getPoint(event);
        context.beginPath();
        context.moveTo(lastPointRef.current.x, lastPointRef.current.y);
        context.lineTo(point.x, point.y);
        context.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
        context.strokeStyle = darkMode && color === colors[0] ? "#f4f1e9" : color;
        context.lineWidth = tool === "eraser" ? size * 4 : size;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.stroke();
        context.globalCompositeOperation = "source-over";
        lastPointRef.current = point;
    };

    const stopDrawing = () => {
        if (drawingRef.current) setStrokes((count) => count + 1);
        drawingRef.current = false;
        lastPointRef.current = null;
    };

    const clearBoard = () => {
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        historyRef.current.push({
            imageData: context.getImageData(0, 0, canvas.width, canvas.height),
            strokes
        });
        context.clearRect(0, 0, canvas.width, canvas.height);
        setStrokes(0);
    };

    const undo = () => {
        const previous = historyRef.current.pop();
        if (!previous) return;
        canvasRef.current.getContext("2d").putImageData(previous.imageData, 0, 0);
        setStrokes(previous.strokes);
    };

    const downloadBoard = () => {
        const link = document.createElement("a");
        link.download = "whiteboard.png";
        link.href = canvasRef.current.toDataURL("image/png");
        link.click();
    };

    return (
        <main className={`app-shell ${darkMode ? "dark-mode" : ""}`} style={{ background: darkMode ? "radial-gradient(circle at 15% 10%, #30383c 0, transparent 35%), #202629" : "radial-gradient(circle at 15% 10%, #f8f4ed 0, transparent 35%), #e8e4dd" }}>
            <header className="topbar">
                <div className="brand">
                    <span className="brand-mark">✦</span>
                    <span>whiteboard</span>
                </div>
                <div className="board-meta">
                    <span className="status-dot" /> autosaved <span className="meta-divider" />{" "}
                    <span>
                        {strokes} {strokes === 1 ? "stroke" : "strokes"}
                    </span>
                </div>
                <button className="theme-button" onClick={() => setDarkMode((enabled) => !enabled)} aria-label={darkMode ? "Use light mode" : "Use dark mode"} title={darkMode ? "Light mode" : "Dark mode"}>
                    {darkMode ? "☼" : "☾"}
                </button>
                <button className="export-button" onClick={downloadBoard}>
                    Export PNG <span aria-hidden="true">↗</span>
                </button>
            </header>

            <section className="workspace">
                <aside className="toolbar" aria-label="Drawing tools">
                    <div className="tool-group">
                        <button className={`tool-button ${tool === "pen" ? "active" : ""}`} onClick={() => setTool("pen")} aria-label="Pen" title="Pen">
                            <span className="pen-icon">✎</span>
                        </button>
                        <button className={`tool-button ${tool === "eraser" ? "active" : ""}`} onClick={() => setTool("eraser")} aria-label="Eraser" title="Eraser">
                            <span>⌫</span>
                        </button>
                        <button className="tool-button" onClick={undo} aria-label="Undo" title="Undo">
                            ↶
                        </button>
                    </div>
                    <div className="tool-rule" />
                    <div className="color-picker" aria-label="Ink colors">
                        {colors.map((swatch) => (
                            <button
                                key={swatch}
                                className={`swatch ${color === swatch ? "selected" : ""}`}
                                style={{ backgroundColor: swatch }}
                                onClick={() => {
                                    setColor(swatch);
                                    setTool("pen");
                                }}
                                aria-label={`Use ${swatch}`}
                            />
                        ))}
                    </div>
                    <div className="tool-rule" />
                    <label className="size-control" title="Brush size">
                        <span className="size-preview" style={{ width: size + 7, height: size + 7 }} /> <input type="range" min="2" max="14" value={size} onChange={(event) => setSize(Number(event.target.value))} aria-label="Brush size" />
                    </label>
                    <div className="tool-spacer" />
                    <button className="tool-button quiet" onClick={clearBoard} aria-label="Clear board" title="Clear board">
                        ⌫
                    </button>
                </aside>

                <div className="canvas-wrap" style={{ backgroundColor: darkMode ? "#202629" : "#fffdf8", backgroundImage: `radial-gradient(${darkMode ? "#3a4447" : "#ddd8cf"} 1px, transparent 1px)` }}>
                    <div className="canvas-label">
                        Untitled board <span>•</span> just now
                    </div>
                    <div className="board-surface" style={{ backgroundColor: darkMode ? "#202629" : "#fffdf8", backgroundImage: `radial-gradient(${darkMode ? "#3a4447" : "#ddd8cf"} 1px, transparent 1px)` }} />
                    <canvas ref={canvasRef} className="board" onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerCancel={stopDrawing} onPointerLeave={stopDrawing} />
                    <div className="canvas-hint">
                        Start sketching anywhere <span>•</span> changes save automatically
                    </div>
                </div>
            </section>
        </main>
    );
}
