import { useEffect, useMemo, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import config from "./config.js";
import "./App.css";

const expressionsList = {
  waiting: { label: "📹 En attente", id: "waiting", gif: "waiting" },
  neutral: { label: "😐 Neutre", id: "neutral", gif: "blank stare" },
  happy: { label: "😀 Heureux", id: "happy", gif: "smiling" },
  sad: { label: "😥 Triste", id: "sad", gif: "sad" },
  angry: { label: "😤 Énervé", id: "angry", gif: "angry" },
  fearful: { label: "😨 Apeuré", id: "fearful", gif: "scared" },
  disgusted: { label: "😖 Dégouté", id: "disgusted", gif: "disgusted" },
  surprised: { label: "😮 Surpris", id: "surprised", gif: "surprised" },
};

function App() {
  const videoRef = useRef();

  const [expressionsGifs, setExpressionsGifs] = useState();
  const [expression, setExpression] = useState("waiting");
  const [isVisible, setIsVisible] = useState(false);

  const poolOfGifs = useMemo(() => {
    if (!expressionsGifs) {
      return [];
    }

    const randompoolOfGifs = expressionsGifs[expression].sort(function () {
      return 0.5 - Math.random();
    });

    return randompoolOfGifs;
  }, [expression, expressionsGifs]);

  const fetchGifsByExpression = async (expression) => {
    const searchQuery = expression.gif;
    const response = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${config.API_KEY}&q=${searchQuery}`
    );
    const json = await response.json();

    if (!json.data) {
      return [];
    }

    const gifs = json.data;

    return gifs;
  };

  const getCurrentExpression = (expressions) => {
    const maxValue = Math.max(
      ...Object.values(expressions).filter((value) => value <= 1)
    );
    const expressionsKeys = Object.keys(expressions);
    const mostLikely = expressionsKeys.filter(
      (expression) => expressions[expression] === maxValue
    );
    return mostLikely[0] ? mostLikely[0] : "Neutral";
  };

  useEffect(() => {
    (async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceExpressionNet.loadFromUri("/models");

      const buffer = Object.values(expressionsList).map(fetchGifsByExpression);

      const gifsByExpression = await Promise.all(buffer);

      const expressionsKeys = Object.keys(expressionsList);
      const expressionGifsArray = [];

      for (let index = 0; index < expressionsKeys.length; index++) {
        expressionGifsArray[expressionsKeys[index]] = gifsByExpression[index];
      }

      setExpressionsGifs(expressionGifsArray);

      if (videoRef.current)
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          videoRef.current.srcObject = stream;
        } catch (err) {
          console.error("Can't found camera. Full error : ", err);
        }
    })();
  }, []);

  useEffect(() => {
    setInterval(async () => {
      if (!videoRef) {
        return;
      }

      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      if (detections && detections[0] && detections[0].expressions) {
        const currentExpression = getCurrentExpression(
          detections[0].expressions
        );

        setExpression(currentExpression);
      }
    }, 1000);
  }, []);

  return (
    <div className="app">
      <div className="grid">
        <div className="grid-item video-grid-item">
          <div className="video-wrapper">
            <video className="video" ref={videoRef} autoPlay muted></video>
            <div className="expression-badge">
              {expressionsList[expression].label}
            </div>
          </div>
        </div>

        {poolOfGifs.slice(0, 15).map((gif) => (
          <div className="grid-item" key={gif.id}>
            <img
              src={gif.images.fixed_height.webp}
              height={gif.images.fixed_height.height}
              width={gif.images.fixed_height.width}
              alt={gif.title}
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {isVisible && (
        <div className="help-modal">
          <h1>What am A.I. supposed to feel?</h1>
          <p>
            IA qui détecte une expression faciale et recherche sur l'API Giphy
            des gifs qui correspondent à cette expression.
          </p>
          <h2>Liste des expressions</h2>
          <ul>
            {expressionsList &&
              Object.values(expressionsList)
                .slice(1)
                .map((expression) => <li>{expression.label}</li>)}
          </ul>
          <button onClick={() => setIsVisible(!isVisible)}>Compris !</button>
        </div>
      )}

      <button className="help-button" onClick={() => setIsVisible(!isVisible)}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="#ffffff"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <a
        href="https://github.com/becoms/what-am-ai-supposed-to-feel"
        className="github"
      >
        <svg
          width="1024"
          height="1024"
          viewBox="0 0 1024 1024"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z"
            transform="scale(64)"
            fill="#FFFFFF"
          />
        </svg>
        <span>Explorer le code</span>
      </a>
    </div>
  );
}

export default App;
