import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ClosingReport from "./pages/ClosingReport";
import OrderHistory from "./pages/OrderHistory";
import NotFound from "./pages/NotFound";
import PublicCalls from "./pages/PublicCalls";

function Router() { return <Switch><Route path="/" component={Home} /><Route path="/pedido" component={Home} /><Route path="/painel" component={Home} /><Route path="/historico" component={OrderHistory} /><Route path="/fechamento" component={ClosingReport} /><Route path="/configuracoes" component={Home} /><Route path="/chamadas" component={PublicCalls} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>; }
function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
export default App;
