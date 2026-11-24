import type { Icon, IconProps } from "@phosphor-icons/react";
import {
  ArrowRight as PArrowRight,
  ArrowsClockwise as PArrowsClockwise,
  ArrowsOut as PArrowsOut,
  Bank as PBank,
  Bell as PBell,
  BellRinging as PBellRinging,
  BookOpen as PBookOpen,
  Briefcase as PBriefcase,
  Bug as PBug,
  Building as PBuilding,
  Buildings as PBuildings,
  Calculator as PCalculator,
  CalendarCheck as PCalendarCheck,
  CalendarDot as PCalendarDot,
  CalendarDots as PCalendarDots,
  CalendarPlus as PCalendarPlus,
  Camera as PCamera,
  CaretDown as PCaretDown,
  CaretLeft as PCaretLeft,
  CaretRight as PCaretRight,
  Certificate as PCertificate,
  ChartBar as PChartBar,
  ChatCircle as PChatCircle,
  ChatText as PChatText,
  Check as PCheck,
  CheckCircle as PCheckCircle,
  Circle as PCircle,
  CircleNotch as PCircleNotch,
  ClipboardText as PClipboardText,
  Clock as PClock,
  Coins as PCoins,
  Columns as PColumns,
  Compass as PCompass,
  CreditCard as PCreditCard,
  DeviceMobile as PDeviceMobile,
  EnvelopeSimple as PEnvelopeSimple,
  Eye as PEye,
  FileMagnifyingGlass as PFileMagnifyingGlass,
  FileText as PFileText,
  FileXls as PFileXls,
  Flag as PFlag,
  Flame as PFlame,
  FolderPlus as PFolderPlus,
  Gear as PGear,
  GearSix as PGearSix,
  GlobeHemisphereWest as PGlobeHemisphereWest,
  Handshake as PHandshake,
  HardHat as PHardHat,
  Heart as PHeart,
  HourglassMedium as PHourglassMedium,
  House as PHouse,
  Info as PInfo,
  Key as PKey,
  Lightbulb as PLightbulb,
  Lightning as PLightning,
  Link as PLink,
  List as PList,
  Lock as PLock,
  MagnifyingGlass as PMagnifyingGlass,
  MapPin as PMapPin,
  MapPinArea as PMapPinArea,
  MapTrifold as PMapTrifold,
  Megaphone as PMegaphone,
  Minus as PMinus,
  Money as PMoney,
  Moon as PMoon,
  Note as PNote,
  PaperPlaneRight as PPaperPlaneRight,
  Paperclip as PPaperclip,
  PenNib as PPenNib,
  Phone as PPhone,
  Plus as PPlus,
  PlusCircle as PPlusCircle,
  Question as PQuestion,
  Ruler as PRuler,
  Scales as PScales,
  Scroll as PScroll,
  SealCheck as PSealCheck,
  ShareNetwork as PShareNetwork,
  Shield as PShield,
  ShieldCheck as PShieldCheck,
  ShieldWarning as PShieldWarning,
  SignOut as PSignOut,
  Signature as PSignature,
  SlidersHorizontal as PSlidersHorizontal,
  SquaresFour as PSquaresFour,
  Star as PStar,
  Sun as PSun,
  Tag as PTag,
  Target as PTarget,
  Trash as PTrash,
  Tray as PTray,
  Tree as PTree,
  TrendDown as PTrendDown,
  TrendUp as PTrendUp,
  UploadSimple as PUploadSimple,
  User as PUser,
  Users as PUsers,
  VideoCamera as PVideoCamera,
  Wallet as PWallet,
  Warning as PWarning,
  Wrench as PWrench,
  X as PX,
  XCircle as PXCircle,
} from "@phosphor-icons/react/dist/ssr";

/* ── Icônes du site (charte graphique) ──
   Famille Phosphor (licence MIT), en style plein (« fill ») : des formes pleines et arrondies, plus chaleureuses
   et plus visibles sur téléphone que de simples traits. Les noms reprennent ceux utilisés jusqu'ici dans le code,
   pour que chaque page n'ait qu'à importer depuis « @/components/icones ».
   Version « ssr » de Phosphor : fonctionne aussi bien dans les composants serveur que navigateur. */

export type ProprietesIcone = Omit<IconProps, "weight"> & { strokeWidth?: number };
export type TypeIcone = (p: ProprietesIcone) => React.JSX.Element;

function icone(Composant: Icon, poids: IconProps["weight"] = "fill"): TypeIcone {
  // Taille par défaut : 24 px (comme avant) ; « strokeWidth » n'a pas de sens pour une icône pleine.
  const Icone = ({ strokeWidth: _trait, size = 24, ...p }: ProprietesIcone) => <Composant weight={poids} size={size} {...p} />;
  return Icone;
}

export const AlertTriangle = icone(PWarning);
export const ArrowRight = icone(PArrowRight);
export const BadgeCheck = icone(PSealCheck);
export const Banknote = icone(PMoney);
export const BarChart3 = icone(PChartBar);
export const BellPlus = icone(PBellRinging);
export const Bug = icone(PBug);
export const Building2 = icone(PBuildings);
export const Calculator = icone(PCalculator);
export const CalendarCheck = icone(PCalendarCheck);
export const CalendarClock = icone(PCalendarDot);
export const CalendarDays = icone(PCalendarDots);
export const CalendarPlus = icone(PCalendarPlus);
export const Camera = icone(PCamera);
export const Check = icone(PCheck);
export const CheckCircle = icone(PCheckCircle);
export const CheckCircle2 = icone(PCheckCircle);
export const ChevronDown = icone(PCaretDown);
export const ChevronLeft = icone(PCaretLeft);
export const ChevronRight = icone(PCaretRight);
export const Circle = icone(PCircle, "regular");
export const ClipboardCheck = icone(PClipboardText);
export const Clock = icone(PClock);
export const Coins = icone(PCoins);
export const Columns2 = icone(PColumns);
export const Compass = icone(PCompass);
export const CreditCard = icone(PCreditCard);
export const Eye = icone(PEye);
export const FileCheck = icone(PCertificate);
export const FileClock = icone(PHourglassMedium);
export const FileSearch = icone(PFileMagnifyingGlass);
export const FileSignature = icone(PSignature);
export const FileSpreadsheet = icone(PFileXls);
export const FileText = icone(PFileText);
export const Flag = icone(PFlag);
export const Flame = icone(PFlame);
export const FolderPlus = icone(PFolderPlus);
export const Globe2 = icone(PGlobeHemisphereWest);
export const Handshake = icone(PHandshake);
export const HardHat = icone(PHardHat);
export const Heart = icone(PHeart);
export const HelpCircle = icone(PQuestion);
export const Home = icone(PHouse);
export const Inbox = icone(PTray);
export const Info = icone(PInfo);
export const KeyRound = icone(PKey);
export const Landmark = icone(PBank);
export const Lightbulb = icone(PLightbulb);
export const Link2 = icone(PLink);
export const Loader2 = icone(PCircleNotch, "bold");
export const Lock = icone(PLock);
export const Mail = icone(PEnvelopeSimple);
export const Map = icone(PMapTrifold);
export const MapPin = icone(PMapPin);
export const Maximize2 = icone(PArrowsOut);
export const Megaphone = icone(PMegaphone);
export const MessageCircle = icone(PChatCircle);
export const MessageSquare = icone(PChatText);
export const Minus = icone(PMinus);
export const Moon = icone(PMoon);
export const Paperclip = icone(PPaperclip);
export const PenLine = icone(PPenNib);
export const Phone = icone(PPhone);
export const Plus = icone(PPlus);
export const RefreshCw = icone(PArrowsClockwise);
export const Ruler = icone(PRuler);
export const Scale = icone(PScales);
export const ScrollText = icone(PScroll);
export const Search = icone(PMagnifyingGlass);
export const Send = icone(PPaperPlaneRight);
export const Settings = icone(PGear);
export const Settings2 = icone(PGearSix);
export const Share2 = icone(PShareNetwork);
export const Shield = icone(PShield);
export const ShieldAlert = icone(PShieldWarning);
export const ShieldCheck = icone(PShieldCheck);
export const SlidersHorizontal = icone(PSlidersHorizontal);
export const Smartphone = icone(PDeviceMobile);
export const Star = icone(PStar);
export const StickyNote = icone(PNote);
export const Sun = icone(PSun);
export const Target = icone(PTarget);
export const Trash2 = icone(PTrash);
export const TrendingDown = icone(PTrendDown);
export const TrendingUp = icone(PTrendUp);
export const TriangleAlert = icone(PWarning);
export const Upload = icone(PUploadSimple);
export const User = icone(PUser);
export const Users = icone(PUsers);
export const Video = icone(PVideoCamera);
export const Wallet = icone(PWallet);
export const Wrench = icone(PWrench);
export const X = icone(PX);
export const XCircle = icone(PXCircle);
export const Zap = icone(PLightning);
export const Bell = icone(PBell);
export const BookOpen = icone(PBookOpen);
export const Briefcase = icone(PBriefcase);
export const Building = icone(PBuilding);
export const CircleHelp = icone(PQuestion);
export const LayoutGrid = icone(PSquaresFour);
export const LogOut = icone(PSignOut);
export const MapPinned = icone(PMapPinArea);
export const Menu = icone(PList);
export const PlusCircle = icone(PPlusCircle);
export const Tag = icone(PTag);
export const Trees = icone(PTree);
