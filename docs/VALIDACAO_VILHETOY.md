# Validação da patrocinadora Vilhetoy

A patrocinadora **Vilhetoy Auto Center** foi cadastrada no SQLite local como ativa, com a imagem persistida em `/manus-storage/vilhetoy-auto-center_6f6cc9bc.jpg` e fundo personalizado `#fff200`.

A arte utilizada foi identificada em uma fonte pública associada à Vilhetoy Auto Center e preserva o nome, a identidade visual e os dados de contato apresentados na imagem. Como prática de operação, recomenda-se confirmar a autorização de uso diretamente com o patrocinador antes do evento.

## Evidência visual

A rota pública `/chamadas` foi capturada em **1280 × 720 px** após o cadastro. A marca apareceu inteira no cartão inferior de patrocinadores, sem corte horizontal ou vertical.

O CSS da grade pública usa `object-fit: contain` e `object-position: center` para preservar a proporção da imagem:

```css
.sponsor-tile img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
}
```

A imagem de origem possui **200 × 200 px** e a área de exibição mantém a arte centralizada dentro do cartão, preenchendo o fundo amarelo ao redor sem distorção ou recorte.
