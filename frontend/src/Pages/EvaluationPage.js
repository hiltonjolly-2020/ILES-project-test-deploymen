// EvaluationPage.jsx
import { useState } from "react";
import axios from "axios";
import API_URL from '../utils/api';
export default function EvaluationPage() {
  const [score, setScore] = useState("");
  const [comments, setComments] = useState("");

  const submitEvaluation = (e) => {
    e.preventDefault();

    axios.post("http://127.0.0.1:8000/evaluations/workplace/", {
      score,
      comments
    })
    .then(() => alert("Evaluation submitted"))
    .catch(err => console.log(err));
  };

  return (
    <form onSubmit={submitEvaluation}>
      <h2>Submit Evaluation</h2>
      <input
        type="number"
        placeholder="Score"
        value={score}
        onChange={(e) => setScore(e.target.value)}
      />
      <textarea
        placeholder="Comments"
        value={comments}
        onChange={(e) => setComments(e.target.value)}
      />
      <button type="submit">Submit</button>
    </form>
  );
}