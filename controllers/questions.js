/**
 * GET /questions
 * Questions.
 */
exports.questions = function(req, res) {
  res.render('questions', {
    title: 'Questions'
  });
};
