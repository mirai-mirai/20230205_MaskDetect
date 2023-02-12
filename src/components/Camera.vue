<script setup lang="ts">
import { ref, onMounted } from 'vue'
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-converter';
import '@mediapipe/face_detection';
import * as faceDetection from '@tensorflow-models/face-detection';
import * as tmImage from '@teachablemachine/image';
import Toggle from './Vue3ToggleButton.vue';
import * as JSZip from 'jszip';
import modelURL from '/model.json?url'; // publicを参照
import metadataURL from '/metadata.json?url';

const [videoRef, resultCanvasRef] = [ref(), ref()];
let [isCamera, isFace] = [ref(true), ref(true)];
let video: HTMLVideoElement;
let videoCanvas: HTMLCanvasElement;
let resultCanvas: HTMLCanvasElement;
let detector: faceDetection.FaceDetector;
let tMachine: tmImage.CustomMobileNet | undefined;
let detectTime: string = '';
let tmTime: string = '';

const lg = (msg: any) => { console.log(msg) };

const initCamera = async () => {
  const opt = { video: { width: 640, height: 480 }, audio: false };
  video.srcObject = await navigator.mediaDevices.getUserMedia(opt);
  isCamera.value && video.play();
  statusUpdate();
}

const initFaceDetector = async () => {
  const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
  detector = await faceDetection.createDetector(model, { runtime: 'tfjs' });
  statusUpdate();
}

const initTMachine = async () => {
  tMachine = await tmImage.load(modelURL, metadataURL);
  statusUpdate();
}

const statusUpdate = () => {
  document.getElementById("msg")!.innerHTML =
    `camera:${video?.srcObject ? video.videoWidth + "x" + video.videoHeight : 'wait'
    }<br/>
faceDetector:${detector ? 'OK' + detectTime : 'loading'} <br/>
teachableMachine:${tMachine ? 'OK' + tmTime : 'loading'} `
}

const camToggle = () => { isCamera.value ? video.play() : video.pause() }

interface ModelData {
  model: File | null;
  meta: File | null;
  weights: File | null;
}

const dropModel = async (e: DragEvent) => {
  const firstFile = e.dataTransfer!.files[0];
  const zip = await JSZip.loadAsync(firstFile);
  let model: ModelData = { model: null, meta: null, weights: null };

  for (const [key, obj] of Object.entries(zip.files)) {
    const blob = await obj.async("blob");
    const file = new File([blob], key);
    switch (key) {
      case 'model.json': model.model = file; break;
      case 'metadata.json': model.meta = file; break;
      case 'weights.bin': model.weights = file; break;
    }
  }
  tMachine = undefined;
  statusUpdate();
  tMachine = await tmImage.loadFromFiles(model.model!, model.weights!, model.meta!);
  statusUpdate();

}

const init = async () => {
  lg('mounted');

  video = videoRef.value;
  resultCanvas = resultCanvasRef.value;
  videoCanvas = document.createElement("canvas");
  const trimCanvas = document.createElement("canvas");
  [trimCanvas.width, trimCanvas.height] = [96, 96];

  let ctxVideo = videoCanvas.getContext("2d");
  let ctxResult = resultCanvas.getContext("2d")!;
  let ctxTrim = trimCanvas.getContext("2d");
  statusUpdate();
  initCamera();
  initFaceDetector();
  initTMachine();

  interface Box { x: number, y: number, w: number, h: number }

  const loop = async () => {
    if (video.paused) {
      ctxResult.fillStyle = 'rgba(0,0,0)';
      ctxResult.fillRect(0, 0, resultCanvas.width, resultCanvas.height);
      detectTime = '';
      tmTime = '';
      statusUpdate();
      return;
    }
    ctxVideo?.drawImage(video, 0, 0);
    if (!isFace.value) {
      ctxResult?.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
      tmTime = '';
      detectTime = '';
      statusUpdate();
    }
    if (isFace.value && detector) {
      const cfg = { flipHorizontal: false };
      const t1 = performance.now();
      const faces = await detector.estimateFaces(videoCanvas, cfg);
      const t2 = performance.now();
      detectTime = ` (${(Math.floor(t2 - t1))} ms)`;
      statusUpdate();

      const drawBox = (box: Box, color: string) => {
        const { x, y, w, h } = box;
        ctxResult.fillStyle = color;
        ctxResult?.fillRect(x, y, w, h);
      }

      const trimImage = (box: Box) => {
        const { x, y, w, h } = box;
        ctxTrim?.drawImage(videoCanvas, x, y, w, h, 0, 0, 96, 96);
      }

      if (faces?.length) {
        const { xMin, yMin, width, height } = faces[0].box;
        const faceBox: Box = { x: xMin, y: yMin, w: width, h: height }
        // drawBox(faceBox, 'rgba(255,255,255,0.2)');

        const { x, y } = faces[0].keypoints[3];
        const w = width / 2, h = w;
        const mouthBox: Box = { x: x - w / 2, y: y - w / 2, w, h }
        trimImage(mouthBox);

        let pred: any = [];

        if (tMachine) {
          const t1 = performance.now();
          pred = await tMachine.predict(trimCanvas);
          const t2 = performance.now();
          tmTime = ` (${(Math.floor(t2 - t1))} ms)`;
          ctxResult.fillText('test', 10, 10);

          const x = mouthBox.x;
          const y = mouthBox.y;
          ctxResult?.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
          drawBox(mouthBox, 'rgba(255,255,255,0.5)');

          for (let i = 0; i < pred.length; i++) {
            const { className, probability } = pred[i];
            ctxResult.font = '12px serif';
            ctxResult.fillStyle = 'rgb(0,0,0)';
            ctxResult.textBaseline = 'top';
            ctxResult?.fillText(className, x, y + i * 20 + 5);
            const m = ctxResult.measureText(className);
            const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
            ctxResult!.fillStyle = 'rgba(0,0,255,0.5)';
            ctxResult?.fillRect(x, y + i * 20 + h + 7, probability * w, 7);
          }
        }

      }
    }

    setTimeout(loop, 300);
  }

  video.onplaying = e => {
    lg('onplaying');
    const resizeCanvas = (c: HTMLCanvasElement) => {
      [c.width, c.height] = [video.videoWidth, video.videoHeight];
    }
    resizeCanvas(resultCanvas);
    resizeCanvas(videoCanvas);
    loop()
  };

}

onMounted(init);

</script>

<template>
  <div class="dropArea" @dragover.prevent @drop.prevent="dropModel">
    <div class="toggleArea">
      Camera <br />
      <Toggle class="toggle" v-model:isActive="isCamera" @on-change="camToggle" />
    </div>
    <div class="toggleArea">
      Mouth
      <Toggle class="toggle" v-model:isActive="isFace" />
    </div>
    <br />
    <div class="videoArea">
      <video ref="videoRef" muted></video>
      <canvas class="resultCanvas" ref="resultCanvasRef"></canvas>
    </div>
    <div id="msg"></div>
  </div>
</template>

<style scoped>
.dropArea {
  width: 100vw;
  height: 100vh;
  background-color: black;
  color: lightskyblue;
}

.toggleArea {
  display: inline-block;
  text-align: center;
  margin: 10px 30px 5px 10px;
  vertical-align: center;
  font-size: 130%;
}

.toggle {
  margin-left: 10px;
}

button {
  width: 120px;
  height: 50px;
  margin: 5px;
}

.videoArea {
  position: relative;
}

video {
  width: 640px;
  height: 480px;
}

.resultCanvas {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 640px;
  height: 480px;
}

#msg {
  margin-left: 5px;
}
</style>
