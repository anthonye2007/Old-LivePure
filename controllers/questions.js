/**
 * GET /questions
 * Questions.
 */
exports.questions = function(req, res) {
  res.render('questions', {
    title: 'Questions'
  });
};

/**
 * POST /questions
 * Display questions.
 */
exports.postQuestions = function(req, res) {
  req.assert('porn', 'porn cannot be blank').notEmpty();
  req.assert('masterbate', 'masterbate cannot be blank').notEmpty();
  req.assert('memorize', 'Memorize cannot be blank').notEmpty();
  console.log("Got post!");

  var answers = req.body;
  console.log("Porn: " + answers.porn);
  console.log(answers);

  // TODO store answers in database

  res.render('answers', {
    title: 'Answers',
    answers: answers
  })
};
