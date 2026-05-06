import "@/styles/globals.css";
import "../components/game.css";   // 新增：导入游戏全局样式

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
