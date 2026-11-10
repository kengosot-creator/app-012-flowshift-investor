(() => {
  const form = document.querySelector('.composer');
  const textarea = form?.querySelector('textarea');
  const sendButton = form?.querySelector('.send-button');
  const conversation = document.querySelector('.conversation');
  const newChatButton = document.querySelector('.new-chat');
  const suggestions = document.querySelectorAll('.suggestion-card');
  let activeSpeechButton = null;

  const stopReading = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (activeSpeechButton) {
      activeSpeechButton.textContent = '▶ 読み上げ';
      activeSpeechButton.classList.remove('speaking');
      activeSpeechButton = null;
    }
  };

  const speakText = (text, button) => {
    if (!('speechSynthesis' in window)) {
      button.textContent = '音声非対応';
      button.disabled = true;
      return;
    }
    if (activeSpeechButton === button) {
      stopReading();
      return;
    }
    stopReading();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 1;
    const voices = window.speechSynthesis.getVoices();
    const japaneseVoice = voices.find(voice => voice.lang === 'ja-JP') ||
      voices.find(voice => voice.lang?.startsWith('ja'));
    if (japaneseVoice) utterance.voice = japaneseVoice;
    utterance.onend = stopReading;
    utterance.onerror = stopReading;
    activeSpeechButton = button;
    button.textContent = '■ 停止';
    button.classList.add('speaking');
    window.speechSynthesis.speak(utterance);
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
      readButton.textContent = '▶ 読み上げ';
      readButton.addEventListener('click', () => speakText(text, readButton));
      item.appendChild(readButton);
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
