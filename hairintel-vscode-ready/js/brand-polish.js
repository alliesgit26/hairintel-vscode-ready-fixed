(function HairIntelBrandPolish() {
  function installStyles() {
    if (document.getElementById('hairintel-brand-lockup-polish')) return;
    const style = document.createElement('style');
    style.id = 'hairintel-brand-lockup-polish';
    style.textContent = `
      .plum-v2 .pv2-wordmark{
        overflow:visible!important;
        text-decoration:none!important;
        background:transparent!important;
        border:0!important;
      }
      .plum-v2 .hi-brand-lockup{
        display:inline-flex!important;
        align-items:center!important;
        gap:12px!important;
        min-width:0!important;
        overflow:visible!important;
      }
      .plum-v2 .hi-brand-mark-shell{
        position:relative!important;
        flex:0 0 auto!important;
        width:46px!important;
        height:46px!important;
        display:grid!important;
        place-items:center!important;
        border-radius:16px 16px 20px 20px!important;
        background:
          radial-gradient(circle at 32% 22%,rgba(255,246,222,.26),transparent 30%),
          linear-gradient(145deg,#563246 0%,#2d1724 58%,#1b0e16 100%)!important;
        border:1px solid rgba(231,201,145,.72)!important;
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.18),
          inset 0 -8px 18px rgba(0,0,0,.18),
          0 8px 24px rgba(46,22,34,.18),
          0 0 0 3px rgba(200,155,89,.07)!important;
      }
      .plum-v2 .hi-brand-mark-shell::before{
        content:""!important;
        position:absolute!important;
        inset:4px!important;
        border:1px solid rgba(255,232,184,.26)!important;
        border-radius:12px 12px 16px 16px!important;
        pointer-events:none!important;
      }
      .plum-v2 .hi-brand-mark-shell::after{
        content:"✦"!important;
        position:absolute!important;
        top:-8px!important;
        right:-7px!important;
        width:18px!important;
        height:18px!important;
        display:grid!important;
        place-items:center!important;
        color:#ffe5ad!important;
        font:400 12px/1 Georgia,serif!important;
        text-shadow:0 0 5px #fff7d7,0 0 12px rgba(232,186,104,.92)!important;
        animation:hairintel-brand-sparkle 3.1s ease-in-out infinite!important;
      }
      .plum-v2 .hi-brand-mark-shell img{
        position:relative!important;
        z-index:1!important;
        display:block!important;
        width:34px!important;
        height:34px!important;
        object-fit:contain!important;
        filter:brightness(1.14) contrast(1.03) drop-shadow(0 2px 5px rgba(0,0,0,.2))!important;
      }
      .plum-v2 .hi-brand-lockup .pv2-wordmark-text{
        display:inline-block!important;
        color:inherit!important;
        font-family:"Bodoni Moda",Didot,"Bodoni MT",serif!important;
        font-weight:500!important;
        line-height:.92!important;
        letter-spacing:.118em!important;
        white-space:nowrap!important;
        text-shadow:none!important;
      }
      .plum-v2 .pv2-logo .hi-brand-lockup .pv2-wordmark-text{
        color:#fff8f0!important;
        font-size:27px!important;
      }
      .plum-v2 .pv2-top-brand .hi-brand-lockup .pv2-wordmark-text{
        color:#321a28!important;
        font-size:29px!important;
      }
      .plum-v2 .hi-public-footer .hi-brand-lockup .pv2-wordmark-text{
        color:#fff8f0!important;
        font-size:23px!important;
      }
      .plum-v2 .pv2-sparkle-i::before{
        top:-.78em!important;
        color:#f3c977!important;
      }
      html.hi-guest .plum-v2 .pv2-top-brand{
        display:inline-flex!important;
        align-items:center!important;
        overflow:visible!important;
      }
      html.hi-guest .plum-v2 .pv2-top-brand .hi-brand-lockup{
        gap:13px!important;
      }
      html.hi-guest .plum-v2 .pv2-top-brand .hi-brand-mark-shell{
        width:50px!important;
        height:50px!important;
        border-radius:17px 17px 22px 22px!important;
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.22),
          inset 0 -9px 20px rgba(0,0,0,.17),
          0 11px 30px rgba(61,30,45,.15),
          0 0 0 4px rgba(200,155,89,.06)!important;
      }
      html.hi-guest .plum-v2 .pv2-top-brand .hi-brand-mark-shell img{
        width:37px!important;
        height:37px!important;
      }
      html.hi-guest .plum-v2 .pv2-top-brand .pv2-wordmark-text{
        font-size:clamp(27px,2.8vw,38px)!important;
        letter-spacing:.13em!important;
      }
      .plum-v2.pv2-collapsed .pv2-logo .hi-brand-lockup{
        gap:0!important;
      }
      .plum-v2.pv2-collapsed .pv2-logo .hi-brand-lockup .pv2-wordmark-text{
        display:none!important;
      }
      .plum-v2.pv2-collapsed .pv2-logo .hi-brand-mark-shell{
        width:42px!important;
        height:42px!important;
      }
      @keyframes hairintel-brand-sparkle{
        0%,100%{opacity:.62;transform:scale(.86) rotate(0deg)}
        48%{opacity:1;transform:scale(1.16) rotate(8deg)}
      }
      @media(max-width:870px){
        .plum-v2 .pv2-top-brand .hi-brand-lockup{gap:8px!important}
        .plum-v2 .pv2-top-brand .hi-brand-mark-shell{
          width:38px!important;height:38px!important;border-radius:13px 13px 16px 16px!important
        }
        .plum-v2 .pv2-top-brand .hi-brand-mark-shell img{width:28px!important;height:28px!important}
        .plum-v2 .pv2-top-brand .hi-brand-lockup .pv2-wordmark-text{
          font-size:20px!important;letter-spacing:.105em!important
        }
      }
      @media(max-width:520px){
        html.hi-guest .plum-v2 .pv2-top-brand .hi-brand-lockup{gap:7px!important}
        html.hi-guest .plum-v2 .pv2-top-brand .hi-brand-mark-shell{
          width:36px!important;height:36px!important;border-radius:12px 12px 15px 15px!important
        }
        html.hi-guest .plum-v2 .pv2-top-brand .hi-brand-mark-shell img{
          width:26px!important;height:26px!important
        }
        html.hi-guest .plum-v2 .pv2-top-brand .pv2-wordmark-text{
          font-size:19px!important;letter-spacing:.1em!important
        }
      }
      @media(prefers-reduced-motion:reduce){
        .plum-v2 .hi-brand-mark-shell::after{animation:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function lockupMarkup() {
    return `
      <span class="hi-brand-lockup">
        <span class="hi-brand-mark-shell" aria-hidden="true">
          <img src="public/hi-monogram.png?v=20260819-brand" alt="" decoding="async">
        </span>
        <span class="pv2-wordmark-text">HAIR<span class="pv2-sparkle-i">I</span>NTEL</span>
      </span>`;
  }

  function polish() {
    installStyles();
    document.querySelectorAll('.plum-v2 .pv2-wordmark').forEach((brand) => {
      if (brand.dataset.hiBrandPolished === '1') return;
      brand.dataset.hiBrandPolished = '1';
      brand.innerHTML = lockupMarkup();
      brand.setAttribute('aria-label', 'HairIntel');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', polish);
  } else {
    polish();
  }

  window.addEventListener('pageshow', polish);
})();