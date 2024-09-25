from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_bootstrap import Bootstrap
from flask_sqlalchemy import SQLAlchemy
import os
import traceback
import re
from datetime import datetime

app = Flask(__name__)
bootstrap = Bootstrap(app)


# Caminho para o banco SQLite (o arquivo será criado automaticamente)
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'videomngr.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ECHO'] = False

# Inicializa o SQLAlchemy
db = SQLAlchemy(app)

# Definição do modelo Filiais
class Filiais(db.Model):
    nroempresa = db.Column(db.Integer, primary_key=True)
    faixaip = db.Column(db.String(50))
    ativa = db.Column(db.Boolean, default=True)
    nome = db.Column(db.String(100), nullable=False)  # Novo campo
    local = db.Column(db.String(100), nullable=False)  # Novo campo

# Definição do modelo Usuarios
class Usuarios(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    usuario = db.Column(db.String(50), nullable=False)
    senha = db.Column(db.LargeBinary, nullable=False)

# Definição do modelo Videos
class Videos(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    periodoini = db.Column(db.Date, nullable=False)
    periodofim = db.Column(db.Date, nullable=False)
    nroempresa = db.Column(db.Integer, db.ForeignKey('filiais.nroempresa'), nullable=False)
    url = db.Column(db.String(255), nullable=False)
    usuinclusao = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    dtaalteracao = db.Column(db.Date, default=datetime.now)  # Definindo data de alteração com valor padrão atual
    ativo = db.Column(db.Boolean, default=True)


# Criação do banco de dados e das tabelas
with app.app_context():
    db.create_all()

# Rota principal (página inicial)
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/upload', methods=['GET', 'POST'])
def upload():
    filiais_campos = Filiais.query.filter_by(ativa=True, local='C').all()
    filiais_rio = Filiais.query.filter_by(ativa=True, local='R').all()

    if request.method == 'POST':
        video_url = request.form['video_url']
        periodoini = datetime.strptime(request.form['periodoini'], '%Y-%m-%d').date()
        periodofim = datetime.strptime(request.form['periodofim'], '%Y-%m-%d').date()
        filiais_selecionadas = request.form.getlist('filiais[]')

        if not filiais_selecionadas:
            print("Nenhuma filial foi selecionada.")
            return "Erro: Nenhuma filial selecionada."

        # Verifica se algum vídeo já está ativo para as filiais selecionadas
        video_ativos = []
        for filial in filiais_selecionadas:
            video_ativo = Videos.query.filter_by(nroempresa=filial, ativo=True).first()
            if video_ativo:
                video_ativos.append(filial)

        # Se algum vídeo estiver ativo, exibe a confirmação no modal
        if video_ativos:
            # Renderiza a página com a informação das filiais com vídeos ativos
            return render_template(
                'upload.html', 
                filiais_campos=filiais_campos, 
                filiais_rio=filiais_rio, 
                video_ativos=video_ativos,  # Passa a lista de filiais com vídeos ativos
                alerta_ativo=True  # Indica que deve mostrar o alerta/modal
            )

        # Se nenhum vídeo estiver ativo, realiza o envio
        try:
            for filial in filiais_selecionadas:
                new_video = Videos(
                    nroempresa=filial,
                    url=video_url,
                    periodoini=periodoini,
                    periodofim=periodofim,
                    usuinclusao="admin",
                    dtaalteracao=datetime.now()
                )
                db.session.add(new_video)

            db.session.commit()
            print(f"Vídeo {video_url} adicionado com sucesso!")

        except Exception as e:
            db.session.rollback()
            print(f"Erro ao adicionar o vídeo: {e}")
            traceback.print_exc()

    # Renderiza a página normalmente
    return render_template('upload.html', filiais_campos=filiais_campos, filiais_rio=filiais_rio)

@app.route('/substituir_video', methods=['POST'])
def substituir_video():
    data = request.get_json()
    video_url = data['video_url']
    periodoini = datetime.strptime(data['periodoini'], '%Y-%m-%d').date()
    periodofim = datetime.strptime(data['periodofim'], '%Y-%m-%d').date()
    filiais_selecionadas = data['filiais']

    print(f"Substituindo vídeos para as filiais: {filiais_selecionadas}")
    print(f"Novo vídeo URL: {video_url}")
    
    try:
        # Inativar os vídeos ativos atuais para as filiais selecionadas
        for filial in filiais_selecionadas:
            video_ativo = Videos.query.filter_by(nroempresa=filial, ativo=True).first()
            if video_ativo:
                video_ativo.ativo = False  # Inativa o vídeo anterior
                db.session.add(video_ativo)

            # Adicionar o novo vídeo ativo
            new_video = Videos(
                nroempresa=filial,
                url=video_url,
                periodoini=periodoini,
                periodofim=periodofim,
                usuinclusao="admin",  # Substitua por um usuário real
                dtaalteracao=datetime.now(),
                ativo=True  # O novo vídeo é marcado como ativo
            )
            db.session.add(new_video)

        db.session.commit()
        print("Vídeos substituídos com sucesso!")
        return jsonify({'success': True})  # Retorna sucesso para o frontend

    except Exception as e:
        db.session.rollback()
        print(f"Erro ao substituir o vídeo: {e}")
        traceback.print_exc()
        return jsonify({'success': False}), 500

@app.route('/view', methods=['GET'])
def view():
    filiais_campos = Filiais.query.filter_by(ativa=True, local='C').all()
    filiais_rio = Filiais.query.filter_by(ativa=True, local='R').all()

    # Obtenha todos os vídeos ativos
    videos = Videos.query.filter_by(ativo=True).all()

    # Dicionário para agrupar vídeos pela URL
    videos_agrupados = {}

    # Agrupa os vídeos pela URL, combinando as filiais
    for video in videos:
        embed_code = get_youtube_embed_code(video.url)
        
        if video.url not in videos_agrupados:
            # Se o vídeo ainda não está no dicionário, crie a entrada
            videos_agrupados[video.url] = {
                'embed_code': embed_code,
                'filiais': [video.nroempresa]  # Adiciona a filial associada ao vídeo
            }
        else:
            # Se o vídeo já está no dicionário, adicione a filial associada
            videos_agrupados[video.url]['filiais'].append(video.nroempresa)

    # Passa os vídeos agrupados para o template
    return render_template('view.html', filiais_campos=filiais_campos, filiais_rio=filiais_rio, videos=list(videos_agrupados.values()))


# Função para extrair o código de embed do YouTube a partir da URL
def get_youtube_embed_code(url):
    # Aqui extraímos o código do vídeo da URL do YouTube
    # O código pode ser ajustado dependendo do formato da URL salva no banco de dados
    regex = r"(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})"
    match = re.search(regex, url)
    return match.group(1) if match else None

# Inicializar a aplicação Flask
if __name__ == '__main__':
    app.run(debug=True)