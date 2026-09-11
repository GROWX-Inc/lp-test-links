/* 日本語の改行位置の制御（PC・SP共通）— 2026-09-12 v3「句点 ＞ 読点 ＞ 文節」の優先順位で改行する
   仕組み（噛み砕き）
   1. 文を BudouX（Google／Apache-2.0）の学習済みモデル assets/budoux-ja.json で「文節」に分ける
   2. 各文節の末尾に優先度を付ける：「。！？」＝3（句点） ＞ 「、」＝2（読点） ＞ それ以外＝1（文節）
   3. 要素の実際の幅（親幅に追従・固定pxなし）と実際のフォントで文字幅を測り、1行に入る範囲を求める
   4. 入りきらない位置で改行するとき、その行の中の候補から「優先度が高い切れ目」を選ぶ
      ・句点は行の25%以上、読点は行の35%以上の位置にあれば優先して採用（短すぎる行を避ける）
      ・どちらも無ければ、最も奥の文節の切れ目で折る。単語の途中では絶対に折らない
   5. 最終行が極端に短い（25%未満）場合は、直前の行の切れ目を手前の読点・句点（15%以上の位置）にずらして整える
   6. 決めた位置に <br> を入れる。画面幅が変わったら元に戻して計算し直す（レスポンシブ）
   ・見出し内の元からある <br>（短い2行構成）は「必ず改行する位置」として尊重する
   ・長い文の途中に打たれた見た目用の <br>（前の行が12文字以上）は外して、上の計算に任せる */
(function(){
  var ZWSP='\u200B';
  var SKIP_INSIDE='.bigv,.cmpv,[data-lv],#lvCount,#lvTime';
  var SEL='h1,h2,.card h4,.slide p,.slide li,.gen .role,.gen .ana,.gen .verb,.gen .as,.gen .mtxt,.pat .desc,.bn .t,.incl-h,.incl-g b,.incl-g span:last-child,.incl-f,.note,.src,.dlab,.dname,.fc-hint';
  var MIN_KUTEN=0.25, MIN_TOUTEN=0.35, MIN_LAST=0.25, MIN_ALT=0.15;

  /* ---- 判定器（BudouX parser.ts と同じ計算） ---- */
  function makeParser(model){
    var base=0;
    Object.keys(model).forEach(function(k){ var t=model[k]; Object.keys(t).forEach(function(c){ base+=t[c]; }); });
    base*=-0.5;
    function g(k,s){ var t=model[k]; return (t&&t[s])||0; }
    return function boundaries(t){
      var out=[];
      for(var i=1;i<t.length;i++){
        var p=base;
        p+=g('UW1',t.substring(i-3,i-2)); p+=g('UW2',t.substring(i-2,i-1)); p+=g('UW3',t.substring(i-1,i));
        p+=g('UW4',t.substring(i,i+1));   p+=g('UW5',t.substring(i+1,i+2)); p+=g('UW6',t.substring(i+2,i+3));
        p+=g('BW1',t.substring(i-2,i));   p+=g('BW2',t.substring(i-1,i+1)); p+=g('BW3',t.substring(i,i+2));
        p+=g('TW1',t.substring(i-3,i));   p+=g('TW2',t.substring(i-2,i+1)); p+=g('TW3',t.substring(i-1,i+2)); p+=g('TW4',t.substring(i,i+3));
        if(p>0) out.push(i);
      }
      return out;
    };
  }

  /* ---- 文字幅の測定（要素の実フォントで測る） ---- */
  var canvas=document.createElement('canvas'), ctx=canvas.getContext('2d');
  function fontOf(el){
    var cs=getComputedStyle(el);
    return {font:cs.fontStyle+' '+cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily, ls:parseFloat(cs.letterSpacing)||0};
  }
  function measure(text,f){ ctx.font=f.font; return ctx.measureText(text).width + f.ls*text.length; }

  /* ---- 長い行の途中に打たれた <br> を外す（見出しの短い2行構成は残す） ---- */
  function relaxBr(el){
    el.querySelectorAll('br').forEach(function(br){
      var prev='', n=br.previousSibling;
      while(n){ prev=(n.textContent||'')+prev; n=n.previousSibling; }
      var line=prev.split('\n').pop().replace(/\s/g,'');
      if(line.length>=12){ br.parentNode.removeChild(br); }
    });
  }

  /* ---- 要素を「文節トークン」の列にする ---- */
  function tokenize(el, boundaries){
    var tokens=[]; /* {node, start, end, text, w, pri} */
    var walker=document.createTreeWalker(el, NodeFilter.SHOW_ALL, null); var n;
    while((n=walker.nextNode())){
      if(n.nodeType===1){ if(n.tagName==='BR'){ tokens.push({br:true,pri:4,w:0}); } continue; }
      if(n.nodeType!==3) continue;
      var p=n.parentElement; if(!p||p.closest('svg')) continue;
      var s=n.nodeValue; if(!s||!/\S/.test(s)) continue;
      var f=fontOf(p);
      var b=boundaries(s); var cuts=[0].concat(b).concat([s.length]);
      for(var i=0;i<cuts.length-1;i++){
        var t=s.slice(cuts[i],cuts[i+1]); if(!t) continue;
        var last=t.replace(/[\s\u200B]+$/,'').slice(-1);
        var pri=/[。！？!?]/.test(last)?3:(/[、，]/.test(last)?2:1);
        tokens.push({node:n,start:cuts[i],end:cuts[i+1],text:t,w:measure(t,f),pri:pri});
      }
    }
    return tokens;
  }

  /* ---- 行の組み立て：幅に収まる範囲で、優先度の高い切れ目を選ぶ ---- */
  function layoutPara(tokens, from, to, W, breaks){ /* [from,to) の範囲＝元からの <br> で区切られた1段落 */
    var paraBreaks=[], lineStart=from;
    while(lineStart<to){
      var acc=0, i=lineStart;
      for(; i<to; i++){ if(acc+tokens[i].w > W && i>lineStart) break; acc+=tokens[i].w; }
      if(i>=to) break; /* 最後の行 */
      var cut=i-1, best=-1, w=0, pos=[];
      for(var k=lineStart;k<=cut;k++){ w+=tokens[k].w; pos.push(w); }
      for(var k2=cut;k2>=lineStart;k2--){ if(tokens[k2].pri===3 && pos[k2-lineStart]>=W*MIN_KUTEN){ best=k2; break; } }
      if(best<0){ for(var k3=cut;k3>=lineStart;k3--){ if(tokens[k3].pri===2 && pos[k3-lineStart]>=W*MIN_TOUTEN){ best=k3; break; } } }
      if(best<0) best=cut;
      paraBreaks.push(best); lineStart=best+1;
    }
    /* 最終行が極端に短いときは、直前の改行を手前の読点／句点にずらす（段落の中だけで判断） */
    if(paraBreaks.length){
      var lastBreak=paraBreaks[paraBreaks.length-1], tail=0;
      for(var t=lastBreak+1;t<to;t++) tail+=tokens[t].w;
      if(tail>0 && tail<W*MIN_LAST){
        var prevStart=paraBreaks.length>=2?paraBreaks[paraBreaks.length-2]+1:from, acc2=0, alt=-1;
        for(var q=prevStart;q<lastBreak;q++){ acc2+=tokens[q].w; if(tokens[q].pri>=2 && acc2>=W*MIN_ALT) alt=q; }
        if(alt>=0){
          var rest=0; for(var r=alt+1;r<to;r++) rest+=tokens[r].w;
          if(rest<=W) paraBreaks[paraBreaks.length-1]=alt;
        }
      }
    }
    paraBreaks.forEach(function(x){ breaks.push(x); });
  }
  function layout(tokens, W){
    var breaks=[], from=0;
    for(var i=0;i<=tokens.length;i++){
      if(i===tokens.length || tokens[i].br){ layoutPara(tokens, from, i, W, breaks); from=i+1; }
    }
    return breaks;
  }

  /* ---- 決めた位置に <br> を入れる ---- */
  function insertBreaks(tokens, breaks){
    /* 後ろから処理するとノード分割で位置がずれない */
    for(var i=breaks.length-1;i>=0;i--){
      var tk=tokens[breaks[i]]; if(tk.br) continue;
      var node=tk.node;
      var after=node.splitText(tk.end);
      var br=document.createElement('br'); br.className='jwbr';
      node.parentNode.insertBefore(br, after);
    }
  }

  var originals=new WeakMap();
  var parser=null;

  function process(el){
    if(el.closest('svg')) return;
    if(el.querySelector(SKIP_INSIDE)) return;
    if(!originals.has(el)) originals.set(el, el.innerHTML);
    else el.innerHTML=originals.get(el);
    if(el.matches('.slide p, .slide li')) relaxBr(el);
    /* flex/grid の中で「中身の幅」に縮んでいる要素は、親幅いっぱいに広げてから測る（幅は親に追従・固定pxなし） */
    el.style.alignSelf='stretch'; el.style.justifySelf='stretch';
    var cs=getComputedStyle(el);
    var W=el.clientWidth-(parseFloat(cs.paddingLeft)||0)-(parseFloat(cs.paddingRight)||0);
    if(W<=0) return;
    var tokens=tokenize(el, parser);
    if(!tokens.length) return;
    var breaks=layout(tokens, W);
    /* ブラウザ側の自動改行は「単語の途中で折らない」保険としてだけ残す */
    el.style.wordBreak='keep-all'; el.style.overflowWrap='anywhere'; el.style.textWrap='wrap';
    insertBreaks(tokens, breaks);
  }

  function run(){ document.querySelectorAll(SEL).forEach(function(el){ try{ process(el); }catch(e){} }); }

  fetch('assets/budoux-ja.json').then(function(r){ return r.json(); }).then(function(model){
    parser=makeParser(model);
    var ready=(document.fonts&&document.fonts.ready)?document.fonts.ready:Promise.resolve();
    ready.then(run);
    var t=0; addEventListener('resize',function(){ clearTimeout(t); t=setTimeout(run,150); });
  }).catch(function(){});
})();
