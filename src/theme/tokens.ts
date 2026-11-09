// Single source of truth. Screens must never hard-code colors, spacing, radius or fonts.
export const color = {
  bg:'#050505', surface1:'#0D0D0D', surface2:'#151515', surface3:'#1F1F1F', border:'#262626',
  textPrimary:'#F5F5F5', textSecondary:'#A3A3A3', textMuted:'#6B6B6B',
  lime500:'#A3E635', lime400:'#BEF264', lime600:'#84CC16', forest600:'#2F7D1F',
  success:'#A3E635', warning:'#FBBF24', danger:'#F87171', onLime:'#0A0A0A',
} as const;
export const space = { 1:4, 2:8, 3:12, 4:16, 5:20, 6:24, 8:32, 10:40 } as const;
export const radius = { card:20, button:16, input:14, sheet:28, cell:4, pill:999 } as const;
export const font = { light:'Outfit_300Light', regular:'Outfit_400Regular', bold:'Outfit_700Bold' } as const;
export const type = {
  display:{fontSize:34,lineHeight:40,letterSpacing:-0.5}, title:{fontSize:24,lineHeight:30,letterSpacing:-0.5},
  heading:{fontSize:18,lineHeight:24}, body:{fontSize:16,lineHeight:24}, caption:{fontSize:13,lineHeight:18},
  streak:{fontSize:64,lineHeight:72,fontVariant:['tabular-nums'] as ('tabular-nums')[]},
} as const;
export const motion = { spring:{damping:18,stiffness:180}, press:0.97, fast:200, slow:350 } as const;
export const layout = { screenPad:20, touchMin:48, cardGap:12 } as const;
export const size = { icon:20, iconLg:28, ring:20, hero:96, heat:14, heatGap:4, avatar:40, avatarLg:72, preview:220 } as const;
