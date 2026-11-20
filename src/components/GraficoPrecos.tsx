import { useState } from 'react';
import { type GestureResponderEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { cores, espaco, fonte } from '@/theme';
import type { Unidade } from '@/types';
import { formatarDataAmigavel, formatarDiaMes } from '@/utils/datas';
import { type PontoPreco, marcasDoEixo, pontoMaisProximo, posicoesNoTempo } from '@/utils/historicoPrecos';
import { formatarReais } from '@/utils/preco';

// Gráfico de linha do preço de um produto ao longo das compras (Fase 3), desenhado com react-native-svg.
// Uma série só (sem legenda: o título da tela diz o que é). Linha de 2px, pontos de 10px com anel da
// cor do fundo, grade discreta, datas no eixo proporcionais ao tempo real entre as compras.
// Tocar ou arrastar no gráfico escolhe o ponto mais perto (linha vertical + valor em cima);
// a tabela com todos os valores fica na tela, logo abaixo (acessível sem tocar no gráfico).

const ALTURA = 190;
const MARGEM = { esquerda: 64, direita: 18, topo: 14, baixo: 30 };
const COR_SERIE = cores.primaria;

type Props = { pontos: PontoPreco[]; unidade: Unidade; nomeProduto: string };

export function GraficoPrecos({ pontos, unidade, nomeProduto }: Props) {
  const [largura, setLargura] = useState(0);
  const [selecionado, setSelecionado] = useState(pontos.length - 1);
  const sel = Math.min(selecionado, pontos.length - 1);

  const precos = pontos.map((p) => p.preco);
  const eixo = marcasDoEixo(Math.min(...precos), Math.max(...precos));
  const xs = posicoesNoTempo(pontos);
  const areaL = Math.max(1, largura - MARGEM.esquerda - MARGEM.direita);
  const areaA = ALTURA - MARGEM.topo - MARGEM.baixo;
  const x = (f: number) => MARGEM.esquerda + f * areaL;
  const y = (v: number) => MARGEM.topo + (1 - (v - eixo.de) / (eixo.ate - eixo.de || 1)) * areaA;

  function tocar(e: GestureResponderEvent) {
    if (!largura) return;
    const f = (e.nativeEvent.locationX - MARGEM.esquerda) / areaL;
    setSelecionado(pontoMaisProximo(xs, f));
  }

  const ponto = pontos[sel];
  const resumoAcessivel =
    `Gráfico do preço de ${nomeProduto}, ${pontos.length} ${pontos.length === 1 ? 'compra' : 'compras'}: ` +
    `de ${formatarReais(Math.min(...precos))} a ${formatarReais(Math.max(...precos))}, ` +
    `último ${formatarReais(precos[precos.length - 1])}. Os valores estão na lista abaixo.`;

  return (
    <View>
      <View style={styles.leitura}>
        <Text style={styles.leituraValor}>
          {formatarReais(ponto.preco)} <Text style={styles.leituraUnidade}>por {unidade}</Text>
        </Text>
        <Text style={styles.leituraData}>
          {sel === pontos.length - 1 ? 'Última compra · ' : ''}
          {formatarDataAmigavel(ponto.em)}
        </Text>
      </View>

      <View
        style={{ height: ALTURA }}
        onLayout={(e) => setLargura(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={tocar}
        onResponderMove={tocar}
        onResponderTerminationRequest={() => true}
        accessible
        accessibilityRole="image"
        accessibilityLabel={resumoAcessivel}
      >
        {largura > 0 && (
          <Svg width={largura} height={ALTURA}>
            {/* Grade e valores do eixo (discretos, texto em tom de texto, nunca na cor da série) */}
            {eixo.marcas.map((v) => (
              <Line
                key={`g${v}`}
                x1={MARGEM.esquerda}
                x2={largura - MARGEM.direita}
                y1={y(v)}
                y2={y(v)}
                stroke={cores.borda}
                strokeWidth={1}
              />
            ))}
            {eixo.marcas.map((v) => (
              <SvgText
                key={`t${v}`}
                x={MARGEM.esquerda - 8}
                y={y(v) + 4}
                fontSize={11}
                fill={cores.textoSecundario}
                textAnchor="end"
              >
                {formatarReais(v)}
              </SvgText>
            ))}

            {/* Datas: primeira e última compra */}
            <SvgText x={x(xs[0])} y={ALTURA - 8} fontSize={11} fill={cores.textoSecundario} textAnchor={pontos.length > 1 ? 'start' : 'middle'}>
              {formatarDiaMes(pontos[0].em)}
            </SvgText>
            {pontos.length > 1 && (
              <SvgText x={x(xs[xs.length - 1])} y={ALTURA - 8} fontSize={11} fill={cores.textoSecundario} textAnchor="end">
                {formatarDiaMes(pontos[pontos.length - 1].em)}
              </SvgText>
            )}

            {/* Linha vertical no ponto escolhido */}
            <Line
              x1={x(xs[sel])}
              x2={x(xs[sel])}
              y1={MARGEM.topo}
              y2={MARGEM.topo + areaA}
              stroke={cores.textoSuave}
              strokeWidth={1}
              strokeDasharray="3 3"
            />

            {pontos.length > 1 && (
              <Polyline
                points={pontos.map((p, i) => `${x(xs[i])},${y(p.preco)}`).join(' ')}
                fill="none"
                stroke={COR_SERIE}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {pontos.map((p, i) => (
              <Circle
                key={`${p.listaId}-${i}`}
                cx={x(xs[i])}
                cy={y(p.preco)}
                r={i === sel ? 7 : 5}
                fill={COR_SERIE}
                stroke={cores.superficie}
                strokeWidth={2}
              />
            ))}
          </Svg>
        )}
      </View>
      {pontos.length > 1 && <Text style={styles.dica}>Toque ou arraste no gráfico para ver cada compra.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  leitura: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: espaco.xs },
  leituraValor: { fontSize: fonte.tamanho.grande, fontWeight: fonte.peso.negrito, color: cores.texto },
  leituraUnidade: { fontSize: fonte.tamanho.pequeno, fontWeight: fonte.peso.medio, color: cores.textoSecundario },
  leituraData: { fontSize: fonte.tamanho.pequeno, color: cores.textoSecundario },
  dica: { fontSize: fonte.tamanho.pequeno, color: cores.textoSuave, textAlign: 'center', marginTop: espaco.xs },
});
