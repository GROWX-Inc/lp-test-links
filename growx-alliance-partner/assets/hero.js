/* スクロール連動のヒーロー映像（コマ画像方式・ローディング画面なし）
   - ヒーローの箱（#heroPin）の中を進んだ割合（0〜100%）をコマ番号に変換し、stickyで貼り付いたcanvasに描く
   - 箱の先頭20%を過ぎたら表紙文字を徐々に消す（CSS変数 --hero-fade）
   - 1枚目を最優先で表示 → 節目のコマ → 残りは現在位置に近い順に裏で読み込む
   - 隣り合う2コマを透明度で重ね、コマ落ち感を消す
   - PC：主役（指先とホログラム）が画面右側に来るよう映像を右寄せして描く（表紙文字は左下）
   - SP：横長のコマを全画面のヒーロー内に全体表示（縦動画が届いたら SP_FRAMES を 'sp' に） */
(function(){
  var cv=document.getElementById('heroCv'); if(!cv) return;
  var pin=document.getElementById('heroPin'), stage=cv.parentNode;
  var ctx=cv.getContext('2d',{alpha:false});
  var N=111;
  var SP=matchMedia('(max-width:767px)').matches;
  /* 暫定：スマホ用の縦動画が届くまでは、スマホでもPC用コマを使う。縦動画を入れたら SP_FRAMES を 'sp' に変える */
  var SP_FRAMES='pc';
  var DIR='assets/hero/'+(SP?SP_FRAMES:'pc')+'/';
  var src=function(i){ return DIR+'f_'+String(i).padStart(3,'0')+'.webp'; };
  /* PCで主役を置く位置：映像内の主役中心（横58%）を、画面幅の78%の位置に合わせる */
  var SUBJECT_X=0.58, TARGET_X=0.78;

  var imgs=new Array(N), loading=new Array(N), loadedCount=0;
  var ANCHOR=10; /* 節目：0,10,20,...,110 */

  function load(i,cb){
    if(imgs[i]||loading[i]) return;
    loading[i]=true;
    var im=new Image();
    im.decoding='async';
    im.onload=function(){ imgs[i]=im; loadedCount++; if(cb) cb(); scheduleDraw(); pump(); };
    im.onerror=function(){ loading[i]=false; };
    im.src=src(i);
  }

  /* 読み込み順序：現在位置に近いコマから、同時最大4本 */
  var target=0;
  function pump(){
    var inflight=0; for(var k=0;k<N;k++) if(loading[k]&&!imgs[k]) inflight++;
    var c=Math.round(target);
    for(var d=0; d<N && inflight<4; d++){
      var a=c+d, b=c-d;
      if(a<N && !imgs[a] && !loading[a]){ load(a); inflight++; }
      if(inflight>=4) break;
      if(d>0 && b>=0 && !imgs[b] && !loading[b]){ load(b); inflight++; }
    }
  }

  /* 描画サイズ（SPは devicePixelRatio 1.5上限） */
  var W=0,H=0,dpr=1;
  function resize(){
    dpr=Math.min(devicePixelRatio||1, SP?1.5:2);
    var r=cv.getBoundingClientRect();
    W=cv.width=Math.round(r.width*dpr); H=cv.height=Math.round(r.height*dpr);
    scheduleDraw();
  }

  /* 描画位置の計算 */
  function drawCover(im,alpha){
    var iw=im.naturalWidth, ih=im.naturalHeight, s, dw, dh, dx, dy;
    if(SP){
      /* 全画面のヒーロー内に全体表示（object-fit: contain 相当）。横長コマは画面上部42%の中に置き、下の表紙文字と重ねない */
      s=Math.min(W/iw, H/ih); dw=iw*s; dh=ih*s; dx=(W-dw)/2;
      dy= dh<H*0.42 ? (H*0.42-dh)/2 : (H-dh)/2;
    }else{
      /* 画面高さに合わせて拡大し、主役が右側に来るよう横位置をずらす（左に空く部分は背景色） */
      s=Math.max(W/iw, H/ih); dw=iw*s; dh=ih*s;
      dx=W*TARGET_X-dw*SUBJECT_X;
      if(dx<W-dw) dx=W-dw;   /* 右端が空かない範囲に制限 */
      dy=(H-dh)/2;
    }
    ctx.globalAlpha=alpha;
    ctx.drawImage(im,dx,dy,dw,dh);
  }

  /* 近くの読み込み済みコマを探す（未到着の間の代替表示） */
  function nearest(i){
    for(var d=0; d<N; d++){ if(imgs[i-d]) return i-d; if(imgs[i+d]) return i+d; }
    return -1;
  }

  var pos=0, rafId=0;
  function draw(){
    rafId=0;
    /* iOS Safariの1拍遅れ対策：目標値へ滑らかに追従 */
    pos+= (target-pos)*0.22;
    if(Math.abs(target-pos)<0.01) pos=target;
    var i0=Math.floor(pos), i1=Math.min(N-1,i0+1), t=pos-i0;
    var a=imgs[i0]?i0:nearest(i0), b=imgs[i1]?i1:a;
    if(a<0) return;
    ctx.globalAlpha=1; ctx.fillStyle='#030306'; ctx.fillRect(0,0,W,H);
    drawCover(imgs[a],1);
    if(b!==a && imgs[b] && t>0) drawCover(imgs[b],t);
    ctx.globalAlpha=1;
    if(pos!==target) scheduleDraw();
  }
  function scheduleDraw(){ if(!rafId) rafId=requestAnimationFrame(draw); }

  /* 箱の中を進んだ割合：箱の上端が画面上端に来た時=0、箱の下端が画面下端に来た時=1 */
  var FADE_START=0.20, FADE_END=0.40; /* 表紙文字を消す区間 */
  function onScroll(){
    var top=pin.getBoundingClientRect().top;
    var range=pin.offsetHeight-innerHeight;
    var p=range>0? Math.min(1,Math.max(0,-top/range)) : 0;
    target=p*(N-1);
    var fade=1-Math.min(1,Math.max(0,(p-FADE_START)/(FADE_END-FADE_START)));
    stage.style.setProperty('--hero-fade',fade.toFixed(3));
    if(p>0.02) stage.classList.add('faded'); /* 一度消えたら、戻っても登場アニメを再生しない */
    scheduleDraw(); pump();
  }

  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',resize);
  resize();
  /* 1枚目 → 節目 → 残り の順で読み込み開始 */
  load(0,function(){ for(var k=ANCHOR;k<N;k+=ANCHOR) load(k); load(N-1); });
  onScroll();
})();
