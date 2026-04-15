import * as Blockly from 'blockly';

export const DarkTheme = Blockly.Theme.defineTheme('dark', {
  name: 'dark',
  base: Blockly.Themes.Classic,
  startHats: true,
  componentStyles: {
    workspaceBackgroundColour: 'var(--shell-bg-soft)',
    // toolboxBackgroundColour: 'blackBackground',
    // toolboxForegroundColour: '#fff',
    flyoutBackgroundColour: 'var(--shell-bg)',
    // flyoutForegroundColour: '#ccc',
    // flyoutOpacity: 1,
    // scrollbarColour: '#fff',
    scrollbarOpacity: 0.1,
    // insertionMarkerColour: '#fff',
    // insertionMarkerOpacity: 0.3,
    // markerColour: '#d0d0d0',
    // cursorColour: '#d0d0d0'
    // selectedGlowColour?: string;
    // selectedGlowOpacity?: number;
    // replacementGlowColour?: string;
    // replacementGlowOpacity?: number;
  },
});
