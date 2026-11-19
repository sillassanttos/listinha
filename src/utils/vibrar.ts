import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

// Vibração de feedback. No Android o impacto "leve" do expo-haptics depende da opção
// "vibração ao tocar" do sistema e em muitos aparelhos não se sente; por isso lá usamos
// a vibração nativa do React Native (permissão VIBRATE já vem no Expo Go). No iOS, haptics.

/** Item marcado como pego: vibração curta e perceptível. */
export function vibrarPego(): void {
  if (Platform.OS === 'android') {
    Vibration.vibrate(45);
    return;
  }
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/** Ação secundária (desmarcar): bem mais suave. */
export function vibrarLeve(): void {
  if (Platform.OS === 'android') {
    Vibration.vibrate(15);
    return;
  }
  Haptics.selectionAsync().catch(() => {});
}

/** Compra concluída: padrão de "sucesso". */
export function vibrarSucesso(): void {
  if (Platform.OS === 'android') {
    Vibration.vibrate([0, 40, 80, 60]);
    return;
  }
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
