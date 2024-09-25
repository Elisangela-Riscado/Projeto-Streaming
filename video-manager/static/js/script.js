document.addEventListener('DOMContentLoaded', function () {

  /************************************/
  /* BLOCO 1: Gerenciamento do Sidebar */
  /************************************/
  
  // Seleciona todos os elementos com a classe "toggle-btn"
  const toggleButtons = document.querySelectorAll('.toggle-btn');

  // Itera sobre cada botão e adiciona o ouvinte de evento para expandir/retrair o sidebar
  toggleButtons.forEach((button) => {
    button.addEventListener('click', function () {
      document.querySelector('#sidebar').classList.toggle('expand');
    });
  });

  /**************************************************/
  /* BLOCO 2: Pré-visualização do Vídeo na Página de Upload */
  /**************************************************/

  const videoUrlInput = document.getElementById('video_url');
  const videoPreview = document.getElementById('video-preview');
  const videoIframe = document.getElementById('video-iframe');

  // Adiciona evento de mudança no campo de URL para exibir um preview do vídeo
  videoUrlInput.addEventListener('input', function () {
    const videoUrl = videoUrlInput.value.trim();
    const videoId = getYouTubeVideoId(videoUrl);

    // Se o ID do vídeo é válido, exibe o iframe do vídeo
    if (videoId) {
      videoIframe.src = `https://www.youtube.com/embed/${videoId}`;
      videoPreview.style.display = 'block';
    } else {
      // Oculta o preview se a URL não for válida
      videoPreview.style.display = 'none';
      videoIframe.src = '';
    }
  });

  /*************************************************************/
  /* BLOCO 3: Gerenciamento dos Checkboxes das Filiais e Formulário */
  /*************************************************************/

  const form = document.getElementById('videoForm');
  const modal = new bootstrap.Modal(document.getElementById('videoModal'));
  let submitForm = false;  // Flag para controlar se o formulário pode ser enviado

  // Verifica se o formulário existe
  if (!form) {
    console.error("O formulário com ID 'videoForm' não foi encontrado!");
    return;
  } else {
    console.log("Formulário encontrado com sucesso!");
  }

  // Seleciona todos os checkboxes das filiais
  const checkboxes = document.querySelectorAll('.filial-checkbox');

  // Gerencia a seleção das filiais e a criação de campos hidden no formulário
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function () {
      const nroempresa = checkbox.getAttribute('data-nroempresa');
      const filialName = checkbox.parentNode.textContent.trim();

      // Delay para garantir que o estado "checked" seja atualizado corretamente
      setTimeout(() => {
        if (checkbox.checked) {
          console.log(`Checkbox para a filial ${nroempresa} foi marcado.`);
          
          // Cria um campo hidden no formulário para enviar o nroempresa
          let hiddenInput = document.getElementById(`input-${nroempresa}`);
          if (!hiddenInput) {
            hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = 'filiais[]';
            hiddenInput.value = nroempresa;
            hiddenInput.setAttribute('id', `input-${nroempresa}`);
            form.appendChild(hiddenInput);
          }
        } else {
          console.log(`Checkbox para a filial ${nroempresa} foi desmarcado.`);
          
          // Remove o campo hidden do formulário quando o checkbox for desmarcado
          const hiddenInputToRemove = document.getElementById(`input-${nroempresa}`);
          if (hiddenInputToRemove) {
            form.removeChild(hiddenInputToRemove);
          }
        }
      }, 10);  // Delay para garantir que o estado do checkbox seja atualizado
    });
  });

/*******************************************************/
/* BLOCO 4: Modal de Confirmação para Vídeos Ativos */
/*******************************************************/

const confirmReplaceBtn = document.getElementById('confirmReplace');
if (confirmReplaceBtn) {
  // Adiciona um listener para exibir o modal de confirmação ao detectar um vídeo ativo
  confirmReplaceBtn.addEventListener('click', function () {
    // Prepara os dados do formulário, incluindo as filiais selecionadas
    const selectedFiliais = [...document.querySelectorAll('input[name="filiais[]"]')].map(el => el.value);
    const videoUrl = document.getElementById('video_url').value;
    const periodoini = document.getElementById('periodoini').value;
    const periodofim = document.getElementById('periodofim').value;

    console.log("Substituindo vídeo para as filiais: ", selectedFiliais);
    console.log("URL do vídeo: ", videoUrl);
    
    // Faz a requisição ao backend para substituir o vídeo nas filiais selecionadas
    fetch('/substituir_video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url: videoUrl,
        periodoini: periodoini,
        periodofim: periodofim,
        filiais: selectedFiliais
      })
    })
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('Erro ao substituir o vídeo');
      }
    })
    .then(data => {
      if (data.success) {
        alert('Vídeo substituído com sucesso!');
        modal.hide();  // Fecha o modal após o sucesso
        // Envia o formulário após o sucesso (isso faz a página ser recarregada)
        form.submit();
      } else {
        alert('Erro ao substituir o vídeo.');
      }
    })
    .catch(error => {
      console.error('Erro ao substituir o vídeo:', error);
    });
  });
} else {
  console.error("O botão 'confirmReplace' não foi encontrado!");
}

// Listener para fechar o modal sem submeter o formulário (caso o usuário cancele)
const cancelReplaceBtn = document.getElementById('cancelReplace');
if (cancelReplaceBtn) {
  cancelReplaceBtn.addEventListener('click', function () {
    submitForm = false;  // Bloqueia o envio do formulário
    modal.hide();  // Fecha o modal sem realizar nenhuma ação adicional
  });
} else {
  console.error("O botão 'cancelReplace' não foi encontrado!");
}


  /*******************************************************/
  /* BLOCO 5: Envio do Formulário e Verificação de Vídeos Ativos */
  /*******************************************************/

  // Verifica vídeos ativos e decide se o formulário pode ser enviado
  form.addEventListener('submit', function (e) {
    const selectedFiliais = document.querySelectorAll('input[name="filiais[]"]');

    // Se o envio ainda não foi confirmado pelo modal, impede o envio
    if (!submitForm) {
      e.preventDefault();  // Impede o envio imediato

      // Verifica se há vídeos ativos e só envia o formulário se permitido
      if (checkActiveVideos()) {
        form.submit();
      }
    }

    // Verifica se há filiais selecionadas
    if (selectedFiliais.length === 0) {
      e.preventDefault(); // Impede o envio do formulário se nenhuma filial estiver selecionada
      alert("Nenhuma filial foi selecionada. Por favor, selecione pelo menos uma.");
    } else {
      // Exibe as filiais selecionadas no console
      selectedFiliais.forEach(input => {
        console.log(`Filial selecionada: ${input.value}`);
      });
    }
  });

/*******************************************************/
/* BLOCO 6: Atualização e Exclusão de Vídeos */
/*******************************************************/

// Função para atualizar o vídeo selecionado
function atualizarVideo(videoId) {
  const filiaisSelecionadas = [];
  document.querySelectorAll(`#dropdownMenuButton${videoId} .form-check-input`).forEach(checkbox => {
    if (checkbox.checked) {
      filiaisSelecionadas.push(checkbox.getAttribute('data-nroempresa'));
    }
  });

  // Faz a requisição ao backend para atualizar as filiais do vídeo
  fetch('/atualizar_video', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      video_id: videoId,
      filiais: filiaisSelecionadas
    })
  })
  .then(response => {
    if (response.ok) {
      return response.json();
    } else {
      throw new Error('Erro ao atualizar o vídeo');
    }
  })
  .then(data => {
    if (data.success) {
      alert('Vídeo atualizado com sucesso!');
      location.reload();  // Recarrega a página após a atualização
    } else {
      alert('Erro ao atualizar o vídeo.');
    }
  })
  .catch(error => {
    console.error('Erro ao atualizar o vídeo:', error);
  });
}

// Função para excluir o vídeo selecionado
function excluirVideo(videoId) {
  if (confirm('Tem certeza que deseja excluir este vídeo?')) {
    // Faz a requisição ao backend para excluir o vídeo
    fetch(`/excluir_video/${videoId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    .then(response => {
      if (response.ok) {
        alert('Vídeo excluído com sucesso!');
        location.reload();  // Recarrega a página após a exclusão
      } else {
        throw new Error('Erro ao excluir o vídeo');
      }
    })
    .catch(error => {
      console.error('Erro ao excluir o vídeo:', error);
    });
  }
}


  /*************************************************************/
  /* BLOCO 7: Funções Reutilizáveis */
  /*************************************************************/

  // Função para verificar se há vídeos ativos (simulação)
  function checkActiveVideos() {
    const filiaisSelecionadas = document.querySelectorAll('.filial-checkbox:checked');
    
    if (filiaisSelecionadas.length === 0) {
      alert('Nenhuma filial selecionada!');
      return false;
    }

    // Simulação da lógica para verificar vídeos ativos
    const hasActiveVideo = true;  // Aqui será ajustado de acordo com a verificação real

    if (hasActiveVideo) {
      modal.show();  // Exibe o modal de confirmação se houver vídeos ativos
      return false;  // Impede o envio imediato
    }
    return true;  // Permite o envio se não houver vídeos ativos
  }

  // Função para extrair o ID do vídeo a partir de uma URL do YouTube
  function getYouTubeVideoId(url) {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

});

