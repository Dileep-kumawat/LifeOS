/**
 * LifeOS Shared Design Tokens
 * Single source of truth extracted from DESIGN.md for both Web and Mobile.
 */
export declare const colors: {
    readonly primary: "#0075de";
    readonly primaryActive: "#005bab";
    readonly secondary: "#213183";
    readonly onPrimary: "#ffffff";
    readonly canvas: "#ffffff";
    readonly canvasSoft: "#f6f5f4";
    readonly surface: "#ffffff";
    readonly hairline: "#e6e6e6";
    readonly inputBorder: "#dddddd";
    readonly ink: "#000000";
    readonly inkSecondary: "#31302e";
    readonly inkMuted: "#615d59";
    readonly inkFaint: "#a39e98";
    readonly accentSky: "#62aef0";
    readonly accentPurple: "#d6b6f6";
    readonly accentPurpleDeep: "#391c57";
    readonly accentPink: "#ff64c8";
    readonly accentOrange: "#dd5b00";
    readonly accentOrangeDeep: "#793400";
    readonly accentTeal: "#2a9d99";
    readonly accentGreen: "#1aae39";
    readonly accentBrown: "#523410";
    readonly success: "#1aae39";
    readonly error: "#dd5b00";
    readonly warning: "#dd5b00";
    readonly info: "#0075de";
};
export declare const spacing: {
    readonly xxs: 4;
    readonly xs: 8;
    readonly sm: 12;
    readonly md: 16;
    readonly lg: 24;
    readonly xl: 28;
    readonly xxl: 32;
};
export declare const radius: {
    readonly xs: 4;
    readonly sm: 5;
    readonly md: 8;
    readonly lg: 12;
    readonly xl: 16;
    readonly full: 9999;
};
export declare const typography: {
    readonly display1: {
        readonly fontSize: 64;
        readonly fontWeight: "700";
        readonly lineHeight: 64;
        readonly letterSpacing: -2.125;
    };
    readonly display2: {
        readonly fontSize: 54;
        readonly fontWeight: "700";
        readonly lineHeight: 56.16;
        readonly letterSpacing: -1.875;
    };
    readonly heading1: {
        readonly fontSize: 40;
        readonly fontWeight: "700";
        readonly lineHeight: 44;
        readonly letterSpacing: -1;
    };
    readonly heading2: {
        readonly fontSize: 26;
        readonly fontWeight: "700";
        readonly lineHeight: 31.98;
        readonly letterSpacing: -0.625;
    };
    readonly heading3: {
        readonly fontSize: 22;
        readonly fontWeight: "700";
        readonly lineHeight: 27.94;
        readonly letterSpacing: -0.25;
    };
    readonly title: {
        readonly fontSize: 20;
        readonly fontWeight: "600";
        readonly lineHeight: 28;
        readonly letterSpacing: -0.125;
    };
    readonly bodyMd: {
        readonly fontSize: 16;
        readonly fontWeight: "400";
        readonly lineHeight: 24;
        readonly letterSpacing: 0;
    };
    readonly bodySm: {
        readonly fontSize: 15;
        readonly fontWeight: "400";
        readonly lineHeight: 19.95;
        readonly letterSpacing: 0;
    };
    readonly button: {
        readonly fontSize: 16;
        readonly fontWeight: "500";
        readonly lineHeight: 24;
        readonly letterSpacing: 0;
    };
    readonly caption: {
        readonly fontSize: 14;
        readonly fontWeight: "400";
        readonly lineHeight: 20.02;
        readonly letterSpacing: 0;
    };
    readonly eyebrow: {
        readonly fontSize: 12;
        readonly fontWeight: "600";
        readonly lineHeight: 15.96;
        readonly letterSpacing: 0.125;
    };
};
export declare const shadows: {
    readonly card: "0 1px 2px rgba(0, 0, 0, 0.05)";
    readonly raised: "0 4px 12px rgba(0, 0, 0, 0.10)";
    readonly overlay: "0 8px 24px rgba(0, 0, 0, 0.18)";
};
export declare const motion: {
    readonly fast: 150;
    readonly base: 250;
    readonly slow: 400;
};
export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Radius = typeof radius;
export type Typography = typeof typography;
export type Shadows = typeof shadows;
export type Motion = typeof motion;
