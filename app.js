(() => {
  const form = document.querySelector('.composer');
  const textarea = form?.querySelector('textarea');
  const sendButton = form?.querySelector('.send-button');
  const conversation = document.querySelector('.conversation');
  const newChatButton = document.querySelector('.new-chat');
  const suggestions = document.querySelectorAll('.suggestion-card');
  let activeSpeechButton = null;
  let speechToken = 0;

  const stopReading = () => {
    speechToken++;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (activeSpeechButton) {
      activeSpeechButton.textContent = '▶ 読み上げ';
      activeSpeechButton.classList.remove('speaking');
      activeSpeechButton = null;
    }
  };

  const speakText = (text, button, rateSelect) => {
    if (!('speechSynthesis' in window)) {
      button.textContent = '音声非対応';
      button.disabled = true;
      return;
    }
    if (activeSpeechButton === button) {
      stopReading();
      return;
    }
    // Android Chromeでは、再生開始直前のcancel()が新しい音声まで止める場合がある。
    // 既に別の読み上げが動いている場合だけ停止する。
    if (activeSpeechButton) stopReading();
    speechToken++;
    const token = speechToken;
    const rate = Number(rateSelect.value) || 1;
    const voices = window.speechSynthesis.getVoices();
    const japaneseVoice = voices.find(voice => voice.lang === 'ja-JP') ||
      voices.find(voice => voice.lang?.startsWith('ja'));
    // 長文を短い単位に分け、ブラウザの読み上げ停止を防ぐ
    const chunks = text.match(/[\\s\\S]{1,160}(?:[。！？、\\n]|$)/g) || [text];
    const speakChunk = (index) => {
      if (token !== speechToken || index >= chunks.length) {
        if (token === speechToken) stopReading();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.lang = 'ja-JP';
      utterance.rate = rate;
      if (japaneseVoice) utterance.voice = japaneseVoice;
      utterance.onend = () => speakChunk(index + 1);
      utterance.onerror = (event) => {
        if (token !== speechToken) return;
        stopReading();
        const status = button.parentElement?.querySelector('.speech-status');
        if (status) status.textContent = '音声を再生できません。Androidのテキスト読み上げ設定を確認してください。';
        console.warn('Speech synthesis error:', event.error);
      };
      window.speechSynthesis.speak(utterance);
    };
    activeSpeechButton = button;
    button.textContent = '■ 停止';
    button.classList.add('speaking');
    speakChunk(0);
  };

  if (!form || !textarea || !sendButton || !conversation) return;

  const messageList = document.createElement('div');
  messageList.id = 'message-list';
  messageList.setAttribute('aria-live', 'polite');
  conversation.insertBefore(messageList, document.querySelector('.suggestions'));

  const updateSendButton = () => {
    sendButton.disabled = textarea.value.trim().length === 0;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
  };

  const addMessage = (role, text) => {
    const item = document.createElement('article');
    item.className = 'chat-message ' + (role === 'user' ? 'user-message' : 'assistant-message');

    const label = document.createElement('div');
    label.className = 'message-label';
    label.textContent = role === 'user' ? 'あなた' : 'FlowShift AI Analyst';

    const body = document.createElement('p');
    body.className = 'message-body';
    body.textContent = text;

    item.append(label, body);

    if (role === 'assistant') {
      const readButton = document.createElement('button');
      readButton.type = 'button';
      readButton.className = 'read-aloud-button';
      readButton.textContent = '🔊 読み上げ';
      readButton.setAttribute('aria-label', 'このAI回答を音声で読み上げる');
      readButton.style.cssText = 'display:inline-flex!important;align-items:center;gap:6px;margin-top:14px;padding:9px 14px;border:1px solid #b9d7c6;border-radius:8px;color:#315d4a;background:#f0f7f2;font-size:12px;font-weight:600;cursor:pointer;visibility:visible;opacity:1;';
      const controls = document.createElement('div');
      controls.className = 'speech-controls';
      const rateSelect = document.createElement('select');
      rateSelect.className = 'speech-rate';
      rateSelect.setAttribute('aria-label', '読み上げ速度');
      [['0.8', 'ゆっくり'], ['1', '標準'], ['1.2', '少し速い'], ['1.5', '速い']].forEach(([value, caption]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = caption;
        if (value === '1') option.selected = true;
        rateSelect.appendChild(option);
      });
      readButton.addEventListener('click', () => speakText(text, readButton, rateSelect));
      const status = document.createElement('span');
      status.className = 'speech-status';
      status.setAttribute('role', 'status');
      status.style.cssText = 'font-size:11px;color:#9a6254;';
      controls.append(readButton, rateSelect, status);
      item.appendChild(controls);
    }

    messageList.appendChild(item);
    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const sendMessage = () => {
    const question = textarea.value.trim();
    if (!question) return;

    addMessage('user', question);
    textarea.value = '';
    updateSendButton();

    addMessage(
      'assistant',
      'メッセージを受け取りました。現在は画面動作確認用の仮返信です。次の段階でGAS・Gemini分析機能に接続します。'
    );
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    sendMessage();
  });

  textarea.addEventListener('input', updateSendButton);
  textarea.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  suggestions.forEach((card) => {
    card.addEventListener('click', () => {
      const title = card.querySelector('strong')?.textContent || '';
      const prompt = {
        'INITIAL_FLOWを探す': '今回の分析でINITIAL_FLOWの観点から注目すべき銘柄を教えてください。',
        'テーマの広がりを見る': '複数銘柄で動きが出ているテーマを確認してください。',
        '継続性を検証する': 'SUSTAINED_FLOWの候補と継続性を検証してください。',
        '再加速の兆候を探す': 'RE_ACCELERATIONの候補を確認してください。'
      }[title];
      if (prompt) {
        textarea.value = prompt;
        updateSendButton();
        textarea.focus();
      }
    });
  });

  newChatButton?.addEventListener('click', () => {
    stopReading();
    messageList.replaceChildren();
    textarea.value = '';
    updateSendButton();
    textarea.focus();
  });

  updateSendButton();
})();
