/* 日本語の文節改行（SP専用）
   BudouX（Google／Apache-2.0）の学習済みモデル assets/budoux-ja.json を読み込み、
   同じ判定アルゴリズムで文節の切れ目にゼロ幅スペースを入れる。PC（768px以上）では何もしない。 */
(function(){
  if(!matchMedia('(max-width:767px)').matches) return;
  var ZWSP='\u200B';

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

  /* ---- 要素内のテキストノードに区切りを入れる ---- */
  function apply(el, boundaries){
    var walker=document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var nodes=[]; var n;
    while((n=walker.nextNode())){
      var p=n.parentElement;
      if(!p || p.closest('svg')) continue;
      if(getComputedStyle(p).whiteSpace==='nowrap') continue; /* nowrap指定の箇所は触らない */
      if(n.nodeValue && /\S/.test(n.nodeValue)) nodes.push(n);
    }
    nodes.forEach(function(tn){
      var s=tn.nodeValue; if(s.indexOf(ZWSP)>=0) return;
      var b=boundaries(s); if(!b.length) return;
      var parts=[], prev=0;
      b.forEach(function(i){ parts.push(s.slice(prev,i)); prev=i; });
      parts.push(s.slice(prev));
      tn.nodeValue=parts.join(ZWSP);
    });
    el.style.wordBreak='keep-all';
    el.style.overflowWrap='anywhere';
  }

  var sel='h1,h2,.card h4,.slide p,.slide li,.gen .role,.gen .ana,.gen .verb,.gen .as,.gen .mtxt,.pat .desc,.bn .t,.incl-h,.incl-g b,.incl-g span:last-child,.incl-f,.note,.src,.dlab,.dname,.fc-hint';

  fetch('assets/budoux-ja.json').then(function(r){ return r.json(); }).then(function(model){
    var boundaries=makeParser(model);
    document.querySelectorAll(sel).forEach(function(el){
      if(el.closest('svg')) return;
      /* 数値カウントアップ対象（.bigv/.cmpv）や計測表示（[data-lv]など）はJSが文字列を書き換えるため除外 */
      if(el.querySelector('.bigv,.cmpv,[data-lv],#lvCount,#lvTime')) return;
      try{ apply(el, boundaries); }catch(e){}
    });
  }).catch(function(){});
})();
