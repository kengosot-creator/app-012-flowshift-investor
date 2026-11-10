(() => {
  const form = document.querySelector('.composer');
  const textarea = form?.querySelector('textarea');
  const sendButton = form?.querySelector('.send-button');
  const conversation = document.querySelector('.conversation');
  const newChatButton = document.querySelector('.new-chat');
  const suggestions = document.querySelectorAll('.suggestion-card');
  let activeSpeechButton = null;
  let speechToken = 0;
  let conversationHistory = [];

  const resetSpeechButton = () => {
    if (activeSpeechButton) {
      activeSpeechButton.textContent = '▶ 読み上げ';
      activeSpeechButton.classList.remove('speaking');
      activeSpeechButton = null;
    }
  };

  const stopReading = () => {
    speechToken++;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    resetSpeechButton();
  };

  const speakText = (text, button, rateSelect) => {
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      button.textContent = '音声非対応';
      button.disabled = true;
      return;
    }
    if (activeSpeechButton === button) {
      stopReading();
      return;
    }
    if (activeSpeechButton) stopReading();

    const synth = window.speechSynthesis;
    speechToken++;
    const token = speechToken;
    const rate = Number(rateSelect.value) || 1;
    const status = button.parentElement?.querySelector('.speech-status');
    const chunks = [];
    for (let i = 0; i < text.length; i += 120) chunks.push(text.slice(i, i + 120));

    const finish = () => {
      if (token !== speechToken) return;
      resetSpeechButton();
      if (status) status.textContent = '読み上げが終了しました。';
    };

    const speakChunk = (index) => {
      if (token !== speechToken) return;
      if (index >= chunks.length) {
        finish();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      // Android Chromeではvoiceを明示指定すると synthesis-failed になる場合があるため、
      // OS側の日本語音声エンジンに選択を任せる。
      utterance.lang = 'ja-JP';
      utterance.rate = rate;
      utterance.onstart = () => {
        if (token === speechToken && status) status.textContent = '読み上げ中…';
      };
      utterance.onend = () => {
        if (token === speechToken) window.setTimeout(() => speakChunk(index + 1), 120);
      };
      utterance.onerror = (event) => {
        if (token !== speechToken) return;
        resetSpeechButton();
        if (status) status.textContent = '再生エラー: ' + (event.error || '原因を特定できません');
        console.warn('Speech synthesis error:', event.error, event);
      };
      synth.speak(utterance);
    };

    activeSpeechButton = button;
    button.textContent = '■ 停止';
    button.classList.add('speaking');
    if (status) status.textContent = '音声を準備しています…';
    // Android Chromeで一時停止状態が残るケースへの対策
    synth.resume();
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
      const testButton = document.createElement('button');
      testButton.type = 'button';
      testButton.textContent = '短い音声テスト';
      testButton.style.cssText = 'margin:8px 0 0 8px;padding:8px 10px;border:1px solid #ccd8d0;border-radius:8px;background:#fff;color:#315d4a;font-size:12px;';
      testButton.addEventListener('click', () => {
        if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
          status.textContent = 'このブラウザは音声合成に対応していません。';
          return;
        }
        const testUtterance = new SpeechSynthesisUtterance('こんにちは。音声テストです。');
        testUtterance.lang = 'ja-JP';
        testUtterance.onstart = () => { status.textContent = '短い音声テストを再生中です。'; };
        testUtterance.onend = () => { status.textContent = '短い音声テストは正常終了しました。'; };
        testUtterance.onerror = (event) => { status.textContent = '短い音声テストも失敗: ' + (event.error || '不明'); };
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(testUtterance);
      });
      const status = document.createElement('span');
      status.className = 'speech-status';
      status.setAttribute('role', 'status');
      status.style.cssText = 'font-size:11px;color:#9a6254;';
      controls.append(readButton, rateSelect, testButton, status);
      item.appendChild(controls);
    }

    messageList.appendChild(item);
    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  
const sendMessage = async () => {
  const question = textarea.value.trim();
  if (!question) return;

  addMessage('user', question);
  textarea.value = '';
  updateSendButton();

  sendButton.disabled = true;

  const loadingMessage = 'FlowShift AI Analystが分析しています…';
  addMessage('assistant', loadingMessage);

  const loadingItem = messageList.lastElementChild;

  try {
    const response = await fetch(
      'https://flowshift-investor-api.kengo-s-ot.workers.dev/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8'
        },
        body: JSON.stringify({
          question: question,
          history: conversationHistory
        })
      }
    );

    const result = await response.json();

    if (!response.ok || result.success === false) {
      throw new Error(result.error || '通信に失敗しました');
    }

    const answer =
      result.answer ||
      result.response ||
      result.text ||
      result.message;

    if (!answer) {
      throw new Error('AIの回答データが見つかりません');
    }

    loadingItem.remove();

    addMessage('assistant', answer);

    conversationHistory.push(
      { role: 'user', text: question },
      { role: 'model', text: answer }
    );

    conversationHistory = conversationHistory.slice(-12);

  } catch (error) {
    loadingItem.querySelector('.message-body').textContent =
      '接続エラー: ' + error.message;

    console.error('FlowShift API error:', error);

  } finally {
    updateSendButton();
  }
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
    conversationHistory = [];
    textarea.value = '';
    updateSendButton();
    textarea.focus();
  });

  updateSendButton();
})();
