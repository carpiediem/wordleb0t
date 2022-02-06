import "./App.css";
import Game from "./Game";

function App() {
  return (
    <div className="App-container">
      <Game maxGuesses={6} />
    </div>
  );
}

export default App;
