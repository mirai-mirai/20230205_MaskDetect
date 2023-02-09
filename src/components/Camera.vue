<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-converter';
import '@mediapipe/face_detection';
import * as faceDetection from '@tensorflow-models/face-detection';
import * as tmImage from '@teachablemachine/image';

// import modelURL from './model.json?url';
// import metadataURL from './metadata.json?url';

const modelURL = '/model.json'; // publicを参照
const metadataURL = '/metadata.json';

const [videoRef, canvasRef, canvasRef2] = [ref(), ref(), ref()];
let video: HTMLVideoElement;
let canvas: HTMLCanvasElement, canvas2: HTMLCanvasElement;
let stream: MediaStream;
let detector: faceDetection.FaceDetector;
let tMachine: tmImage.CustomMobileNet;
let isMasked = ref('');

const lg = (msg: any) => { console.log(msg) };

const init = async () => {
  lg(tf.version_core);
  const tMachineP = tmImage.load(modelURL, metadataURL);

  lg('mounted');
  video = videoRef.value;
  canvas = canvasRef.value;
  canvas2 = canvasRef2.value;
  const ctx = canvas.getContext("2d")!;
  const ctx2 = canvas2.getContext("2d")!;
  canvas.width = 640;
  canvas.height = 480;

  const opt = { video: { width: 640, height: 480 }, audio: false };
  const streamP = navigator.mediaDevices.getUserMedia(opt);

  const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
  const detectorP = faceDetection.createDetector(model, { runtime: 'tfjs' });

  [stream, detector, tMachine] = await Promise.all([streamP, detectorP, tMachineP]);
  lg('init complete');

  const numClasses = tMachine.getTotalClasses();

  video.srcObject = stream;
  video.play();

  interface Box { x: number, y: number, w: number, h: number }

  const loop = async () => {
    if (video.paused) return;
    ctx.drawImage(video, 0, 0);
    const cfg = { flipHorizontal: false };
    const t1 = performance.now();
    const faces = await detector.estimateFaces(canvas, cfg);
    const t2 = performance.now();
    console.log(`${(Math.floor(t2 - t1))}ms`);

    const drawImage = (ctx: CanvasRenderingContext2D, box: Box) => {
      const { x, y, w, h } = box;
      [ctx.canvas.width, ctx.canvas.height] = [w, h];
      ctx.canvas.style.width = '96px';
      ctx.canvas.style.height = '96px';
      ctx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
    }

    if (faces?.length) {
      const { xMin, yMin, width, height } = faces[0].box;
      const faceBox: Box = { x: xMin, y: yMin, w: width, h: height }

      const { x, y } = faces[0].keypoints[3];
      const w = width / 2, h = w;
      const mouthBox: Box = { x: x - w / 2, y: y - w / 2, w, h }
      drawImage(ctx2, mouthBox);
      const pred = await tMachine.predict(canvas2);
      const [c1, c2] = [pred[0].probability, pred[1].probability];
      isMasked.value = `${c1.toFixed(2)} ${c2.toFixed(2)}`;
    }

    setTimeout(loop, 200);
  }

  video.onplaying = e => {
    lg('loop started');
    loop()
  };
}

onMounted(init);

</script>

<template>
  <video ref="videoRef" muted controls></video>
  <canvas ref="canvasRef"></canvas>
  <canvas ref="canvasRef2"></canvas>
  {{ isMasked }}
</template>

<style scoped>
video {
  width: 640px;
}
</style>
