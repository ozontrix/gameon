'use client';

/**
 * The shared UI kit. Screens compose these primitives plus their own domain
 * components; they never re-implement a visual that lives here.
 *
 * One-to-one with the handset app's `components/ui/index.ts`, except that a
 * browser has no icon font: glyph names are the Ionicons/MaterialCommunityIcons
 * *names* from the app, rendered by the `Ion`/`Mdi` components rather than by a
 * font, and any prop that would take an icon takes a node.
 */

export { AppHeader, type HeaderVariant } from './app-header';
export { Badge, type BadgeTone } from './badge';
export { BottomSheet, SHEET_ROOT_ID } from './bottom-sheet';
export { Button, type ButtonSize, type ButtonVariant } from './button';
export { Card, CardRow, Divider } from './card';
export { Chip, type ChipTrailing, type ChipVariant } from './chip';
export { DetailRow } from './detail-row';
export { EmptyState } from './empty-state';
export { FilterBar, type FilterBarItem } from './filter-bar';
export { IconButton } from './icon-button';
export { Ion, Mdi, type IconProps, type IonName, type MdiName } from './icons';
export { InfoNote, type NoteTone } from './info-note';
export { FadeIn, FadeUp, Pop, PressableScale } from './motion';
export { PickerField } from './picker-field';
export { RemoteImage } from './remote-image';
export { ReservedText } from './reserved-text';
export { Screen, ScreenScroll, useBottomClearance, type BottomLayer } from './screen';
export { SectionHeader } from './section-header';
export { SegmentedTabs, type SegmentedOption } from './segmented-tabs';
export { SignInGate, SignInSheet } from './sign-in-gate';
export { Skeleton, SkeletonText, Spinner } from './skeleton';
export { SportPill } from './sport-pill';
export { StatTile } from './stat-tile';
export { StickyFooter } from './sticky-footer';
export { TextField, type TextFieldProps } from './text-field';
export { TextLink } from './text-link';
