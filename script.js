
(function(){
      const post = document.querySelector('[data-post]');
      const likeBtn = post.querySelector('[data-like]');
      const saveBtn = post.querySelector('[data-save]');
      const shareBtn = post.querySelector('[data-share]');
      const commentBtn = post.querySelector('[data-comment]');
      const copyBtn = post.querySelector('[data-copy]');

      const likeCountEl = post.querySelector('[data-like-count]');
      const commentCountEl = post.querySelector('[data-comment-count]');
      const shareCountEl = post.querySelector('[data-share-count]');

      const viewport = post.querySelector('[data-viewport]');
      const prevBtn = post.querySelector('[data-prev]');
      const nextBtn = post.querySelector('[data-next]');
      const pager = post.querySelector('[data-pager]');
      const dots = Array.from(pager.querySelectorAll('.dotbtn'));

      const input = post.querySelector('[data-input]');
      const sendBtn = post.querySelector('[data-send]');

      let liked = false;
      let saved = false;
      let likes = parseInt(likeCountEl.textContent, 10) || 0;
      let comments = parseInt(commentCountEl.textContent, 10) || 0;
      let shares = parseInt(shareCountEl.textContent, 10) || 0;

      function setPressed(btn, isPressed){
        btn.setAttribute('aria-pressed', String(isPressed));
      }

      likeBtn.addEventListener('click', () => {
        liked = !liked;
        setPressed(likeBtn, liked);
        likes += liked ? 1 : -1;
        likeCountEl.textContent = String(likes);
      });

      saveBtn.addEventListener('click', () => {
        saved = !saved;
        setPressed(saveBtn, saved);
      });

      shareBtn.addEventListener('click', async () => {
        shares += 1;
        shareCountEl.textContent = String(shares);

        const url = location.href;
        const data = { title: document.title, text: 'Check out this post', url };

        if (navigator.share) {
          try { await navigator.share(data); } catch(e) { /* user canceled */ }
        } else {
          try {
            await navigator.clipboard.writeText(url);
            shareBtn.textContent = 'Copied';
            setTimeout(()=> shareBtn.innerHTML = shareBtn.innerHTML.replace('Copied','Share'), 900);
          } catch(e) {}
        }
      });

      commentBtn.addEventListener('click', () => {
        input.focus();
      });

      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(location.href);
          copyBtn.textContent = 'Copied';
          setTimeout(()=> copyBtn.textContent = 'Copy link', 900);
        } catch(e) {
          alert('Copy failed. Your browser may block clipboard access.');
        }
      });

      // Auto-grow textarea + enable send
      function autoGrow(){
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 140) + 'px';
        const hasText = input.value.trim().length > 0;
        sendBtn.disabled = !hasText;
      }
      input.addEventListener('input', autoGrow);
      autoGrow();

      sendBtn.addEventListener('click', () => {
        const text = input.value.trim();
        if(!text) return;

        comments += 1;
        commentCountEl.textContent = String(comments);

        // Minimal UX: clear input and disable button
        input.value = '';
        autoGrow();
      });

      // Media carousel controls
      const items = Array.from(viewport.children);
      let index = 0;

      function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

      function goTo(i){
        index = clamp(i, 0, items.length - 1);
        const left = index * viewport.clientWidth;
        viewport.scrollTo({ left, behavior: 'smooth' });
        dots.forEach((d, di) => d.setAttribute('aria-current', String(di === index)));
        prevBtn.disabled = index === 0;
        nextBtn.disabled = index === items.length - 1;
      }

      prevBtn.addEventListener('click', () => goTo(index - 1));
      nextBtn.addEventListener('click', () => goTo(index + 1));
      dots.forEach((d, di) => d.addEventListener('click', () => goTo(di)));

      // Sync index on manual swipe/scroll
      let raf = null;
      viewport.addEventListener('scroll', () => {
        if(raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const w = viewport.clientWidth || 1;
          const i = Math.round(viewport.scrollLeft / w);
          if(i !== index) goTo(i);
        });
      });

      // Initialize
      goTo(0);
      window.addEventListener('resize', () => goTo(index));
})();