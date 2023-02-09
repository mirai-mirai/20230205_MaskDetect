

viteでassetsをどうやって読み込むか？

platform_browser.ts:28          GET http://localhost:3333/assets/model.json net::ERR_ABORTED 404 (Not Found)
t2.fetch @ platform_browser.ts:28



明示的な URL のインポート
内部リストや assetsInclude に含まれていないアセットは URL の末尾に ?url を付与することで明示的にインポートすることができます。これは、例えば Houdini Paint Worklets をインポートするときに便利です。

js
import workletURL from 'extra-scalloped-border/worklet.js?url'
CSS.paintWorklet.addModule(workletURL)

importで?urlを末尾に追加してやれば強制的に読み込めるらしい。

イメージとかはそのまま読み込める


tfjsとのバージョン不整合が面倒：
以下は動いた。

"dependencies": {
  "vue": "^3.2.45"
},
"devDependencies": {
  "@teachablemachine/image": "^0.8.5",
  "@tensorflow/tfjs": "^4.0.0",
  "@vitejs/plugin-vue": "^4.0.0",
  "typescript": "^4.9.3",
  "vite": "^4.0.0",
  "vue-tsc": "^1.0.11"
}

tfjs@4.0.0でも動くか？

動いた！！
tfjsモジュールを個別に居れたのがまずかった？
あるいはいちどVolarを止めて再起動すればよかった？
謎過ぎる

とりあえず動いてよかった
これでface-detectionと連結できればとりあえずOK

あとは、モデルをアップロードできるようにするところ
アップしてzip解凍してストレージに保存するところまで



下記でも動いた
{
  "name": "20230131-cellphonealert",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.2.45"
  },
  "devDependencies": {
    "@mediapipe/face_detection": "~0.4.0",
    "@teachablemachine/image": "^0.8.5",
    "@tensorflow-models/face-detection": "^1.0.1",
    "@tensorflow/tfjs": "^4.2.0",
    "@vitejs/plugin-vue": "^4.0.0",
    "typescript": "^4.9.3",
    "vite": "^4.0.0",
    "vue-tsc": "^1.0.11"
  }
}

でも、実際には3.21.0が使われていた
個別に@tensorflow/tfjs-core@3.21.0
がインストールされているためと思われる

個別にremoveしてみて再度確かめてみるか。

import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
これを書いたから勝手に別にインストールされてしまった？？

node_modulesを見てみると以下がインストールされてた
tfjs-backend-cpu
tfjs-backend-webgl
tfjs-converter
tfjs-core
どれもv3.21.0であった。

であれば、tfjsを削除して、上記を個別に4.2.0に上げてみるか？


npm remove @tensorflow/tfjs @tensorflow/tfjs-backend-cpu @tensorflow/tfjs-backend-webgl @tensorflow/tfjs-converter @tensorflow/tfjs-core --force

npm i --save-dev --force @tensorflow/tfjs-backend-webgl@4.2.0 @tensorflow/tfjs-converter@4.2.0 @tensorflow/tfjs-core@4.2.0 --force

エラーになった。やっぱり4.2はだめらしい。

Uncaught (in promise) TypeError: env(...).platform.isTypedArray is not a function
    at isTypedArray (util.ts:137:25)
    at inferShape (tensor_util_env.ts:29:7)
    at tensor (tensor.ts:195:25)
    at Object.decodeWeights (io_utils.ts:224:19)
    at GraphModel.loadSync (graph_model.ts:187:31)
    at graph_model.ts:157:48
    at async loadGraphModel (graph_model.ts:616:3)

なぜか、tfjs@1.3.1がインストールされている。@teachablemachineのpeerdependencyを考慮しての動きか？
でもたぶん使われてない。importしてないので。

3.21まではいけることは分かった。

4.0でもだめか？

npm i --save-devで上書きインストールできるらしい。これでバージョンアップしてみるか

npm i --save-dev --force @tensorflow/tfjs-backend-webgl@4.0.0 @tensorflow/tfjs-converter@4.0.0 @tensorflow/tfjs-core@4.0.0 --force

あとでtfjsも削除してみるか。

4.0でも別のエラーがでた。やはり3.21.0が限界か。

Uncaught (in promise) TypeError: Nt.fromPixels is not a function
    at fromPixels_ (browser.ts:67:17)
    at Object.fromPixels (operation.ts:45:22)
    at tf.ts:28:35
    at engine.ts:467:20
    at Engine.scopedRun (engine.ts:478:19)
    at Engine.tidy (engine.ts:465:17)
    at Object.je (globals.ts:182:17)
    at Object.capture (tf.ts:27:15)
    at custom-mobilenet.ts:261:30
    at engine.ts:467:20

では、3.21.0にしよう。tfjsは念のため消しておくか。

npm i --save-dev --force @tensorflow/tfjs-backend-webgl@3.21.0 @tensorflow/tfjs-converter@3.21.0 @tensorflow/tfjs-core@3.21.0 --force

またエラーが出た 3.21.0を使ってるのに

Uncaught (in promise) TypeError: Nt.fromPixels is not a function
    at fromPixels_ (browser.ts:67:17)
    at Object.fromPixels (operation.ts:45:22)
    at tf.ts:28:35
    at engine.ts:467:20
    at Engine.scopedRun (engine.ts:478:19)
    at Engine.tidy (engine.ts:465:17)
    at Object.je (globals.ts:182:17)
    at Object.capture (tf.ts:27:15)
    at custom-mobilenet.ts:261:30
    at engine.ts:467:20

tfjs-backend-cpuが足りなかった？　importも少なかった？

npm i --save-dev --force @tensorflow/tfjs-backend-cpu@3.21.0 @tensorflow/tfjs-backend-webgl@3.21.0 @tensorflow/tfjs-converter@3.21.0 @tensorflow/tfjs-core@3.21.0 --force

node_modules/@tensorflowを削除していれなおしてみた。

tfjsとしてまとめてインストールすべきか？

顔はいけてるけど、teachableMachineでこけてるっぽい

バージョン下げてみる？

npm i --save-dev --force @tensorflow/tfjs-backend-webgl@1.3.1 @tensorflow/tfjs-converter@1.3.1 @tensorflow/tfjs-core@1.3.1 --force

それとも個別にimportするから整合性がくずれるのか？

一度全部削除が必要らしい。

ここまで古いと個別でインストールできない。

npm i --save-dev --force @tensorflow/tfjs-backend-webgl@2.0.0 @tensorflow/tfjs-converter@2.0.0 @tensorflow/tfjs-core@2.0.0 --force


一度１つのやつに戻してみよう。

訳が分からなくなってきた。

npm i --save-dev --force @tensorflow/tfjs@3.21.0

tfjsもその他も実態は3.21.0になった。これで動くか？

うごかない。やっぱりだめ。

1.3.1に戻してみる？？

最初はtmImageだけ動かしてから徐々にバージョンあげるやり方ではうまくいった。

バージョンがずれてたのが悪かった？？
├── @tensorflow/tfjs-backend-cpu@3.21.0
├── @tensorflow/tfjs-backend-webgl@2.0.0
├── @tensorflow/tfjs-converter@2.0.0
├── @tensorflow/tfjs-core@2.0.0
├── @tensorflow/tfjs@3.21.0

全部3.21.0にそろえてみる。

npm i --save-dev --force @tensorflow/tfjs-backend-cpu@3.21.0 @tensorflow/tfjs-backend-webgl@3.21.0 @tensorflow/tfjs-converter@3.21.0 @tensorflow/tfjs-core@3.21.0 --force


tfjsとその他のパッケージのバージョンをそろえたらうまくいった。

もしかして全部を4.2.0にあげてやればうまくいく？？

たぶん4.2はだめやから4.0でためしてみるか？？

まず、tfjsだけあげて、残りをあげてみるか

npm i --save-dev --force @tensorflow/tfjs@4.0.0

npm i --save-dev --force @tensorflow/tfjs-backend-cpu@4.0.0 @tensorflow/tfjs-backend-webgl@4.0.0 @tensorflow/tfjs-converter@4.0.0 @tensorflow/tfjs-core@4.0.0 --force

問題なく動いてる。やっぱり個別のバージョンの不整合が原因やった。
コンパイルするときに不整合でおかしくなるせいか？？

でも最新版ではむりか？？

npm i --save-dev --force @tensorflow/tfjs@4.2.0

npm i --save-dev --force @tensorflow/tfjs-backend-cpu@4.2.0 @tensorflow/tfjs-backend-webgl@4.2.0 @tensorflow/tfjs-converter@4.2.0 @tensorflow/tfjs-core@4.2.0 --force


あと、１からインストールして動くかが心配
npm installでうまくいくのか？

後で試してみる

いけてるっぽい！！

4.2でも動くことが分かった。

import '@mediapipe/face_detection';
// import '@tensorflow/tfjs';
// import * as tf from '@tensorflow/tfjs-core';
// import '@tensorflow/tfjs-backend-webgl';
// import '@tensorflow/tfjs-backend-cpu';
// import '@tensorflow/tfjs-converter';
import * as faceDetection from '@tensorflow-models/face-detection';
import * as tmImage from '@teachablemachine/image';

importはしてないけど、mediapipeのところでしてくれてる？？

念のためバージョン確認しとくか。

import * as tf from '@tensorflow/tfjs';
import '@mediapipe/face_detection';
import * as faceDetection from '@tensorflow-models/face-detection';
import * as tmImage from '@teachablemachine/image';

これでも動いた。tfを明示してみた。

まちがいなく4.2で動いてる。

でも、tfjs-backend-cpuとかtfjs-dataとかtfjs-layersはいらないとおもう。

個別に入れてみるか？

  lg(tf.version_core);
まちがいなく4.2.0で動いてる


結局、全体のtfjsのバージョンと個別パッケージのバージョン不整合が原因であった。
それぞれバージョンを指定して個別にインストールすれば完璧

結局これで問題なく動いてる。最新版でもちゃんと動くことが分かった。

"dependencies": {
  "vue": "^3.2.45"
},
"devDependencies": {
  "@mediapipe/face_detection": "~0.4.0",
  "@teachablemachine/image": "^0.8.5",
  "@tensorflow-models/face-detection": "^1.0.1",
  "@tensorflow/tfjs": "^4.2.0",
  "@tensorflow/tfjs-backend-cpu": "^4.2.0",
  "@tensorflow/tfjs-backend-webgl": "^4.2.0",
  "@tensorflow/tfjs-converter": "^4.2.0",
  "@tensorflow/tfjs-core": "^4.2.0",
  "@vitejs/plugin-vue": "^4.0.0",
  "typescript": "^4.9.3",
  "vite": "^4.0.0",
  "vue-tsc": "^1.0.11"
}

tfjsとtfjs-*のバージョンを必ず合わせる。
node_modeuls/*の中身をみてpackage.jsonのバージョンがあっているか確認する
npm i * でバージョン上書きインストールできる

GithubPagesの問題


viteの相対パス設定を変更する

import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  // your other configuration...
});

出力は下記に変わった。
    <script type="module" crossorigin src="./assets/index-568feb92.js"></script>
    <link rel="stylesheet" href="./assets/index-b00ae16e.css">
これでindex.htmlの問題は解決

あとはモデルファイルをどうするか？
publicフォルダにおいて、/model.jsonみたいにアクセスするといいみたい。
publicフォルダのデータはそのままdistルートにコピーされるはず

下記の追加によって、全部dist/に出力されるようになった。
build: {
rollupOptions: {
  output: {
    assetFileNames: '[name]-[hash][extname]',
    chunkFileNames: '[name]-[hash].js',
    entryFileNames: '[name]-[hash].js',
  },
},
},

ただ、pagesにアップするとうまくいかない。

model.jsonをルートから取りに行こうとする。

やっぱりassetsフォルダにおいて名前解決するのがよいのか？
publicフォルダにおいてあるのがよくない？
node_modulesのソースからの参照でもパスを修正してくれる？？

ここを突破しないと相対パスに苦しむことになる。

