var User = require('../models/User');

/**
 * GET /yesterday
 * Answers for most recent day
 */
exports.getYesterday = function(req, res) {
  var questions = req.user.questions;
  var qa = [];
  var date = null;

  questions.forEach(function(q) {
    if (q.answers.length < 1) return;

    var mostRecentAnswer = getMostRecentAnswer(q);
    var questionAndAnswer = { question: q.text, answer: mostRecentAnswer.value };

    if (mostRecentAnswer.date !== date) {
      console.log("Date mismatch for yesterday's answers:");
      console.log("  Prev: " + date);
      console.log("  New: " + mostRecentAnswer.date);
      date = mostRecentAnswer.date;
    }

    console.log("Q: " + questionAndAnswer.question);
    console.log("A: " + questionAndAnswer.answer);
    qa.push(questionAndAnswer);
  });

  res.render('yesterday', {
    title: 'Yesterday',
    date: date,
    questionsAndAnswers: qa
  });
};

var getMostRecentAnswer = function(question) {
  return question.answers[question.answers.length - 1];
};