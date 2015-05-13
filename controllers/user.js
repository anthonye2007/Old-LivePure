var _ = require('lodash');
var async = require('async');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var passport = require('passport');
var User = require('../models/User');
var secrets = require('../config/secrets');

/**
 * GET /login
 * Login page.
 */
exports.getLogin = function(req, res) {
  if (req.user) return res.redirect('/');
  res.render('account/login', {
    title: 'Login'
  });
};

/**
 * POST /login
 * Sign in using email and password.
 */
exports.postLogin = function(req, res, next) {
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('password', 'Password cannot be blank').notEmpty();

  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/login');
  }

  passport.authenticate('local', function(err, user, info) {
    if (err) return next(err);
    if (!user) {
      req.flash('errors', { msg: info.message });
      return res.redirect('/login');
    }

    if (user.questions === undefined || user.questions === null || user.questions.length < 1) {
      initializeQuestions(user);
      user.save(function(err) {
        if (err) return next(err);
        req.logIn(user, function(err) {
          if (err) return next(err);
          req.flash('success', { msg: 'Success! Logged in and initialized questions.'});
          res.redirect('/');
        });
      });
    } else {
      req.logIn(user, function(err) {
        if (err) return next(err);

        req.flash('success', { msg: 'Success! You are logged in.' });
        res.redirect(req.session.returnTo || '/');
      });
    }

  })(req, res, next);
};

/**
 * GET /logout
 * Log out.
 */
exports.logout = function(req, res) {
  req.logout();
  res.redirect('/');
};

/**
 * GET /signup
 * Signup page.
 */
exports.getSignup = function(req, res) {
  if (req.user) return res.redirect('/');
  res.render('account/signup', {
    title: 'Create Account'
  });
};

/**
 * POST /signup
 * Create a new local account.
 */
exports.postSignup = function(req, res, next) {
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('password', 'Password must be at least 4 characters long').len(4);
  req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/signup');
  }

  var user = new User({
    email: req.body.email,
    password: req.body.password
  });

  initializeQuestions(user);

  User.findOne({ email: req.body.email }, function(err, existingUser) {
    if (existingUser) {
      req.flash('errors', { msg: 'Account with that email address already exists.' });
      return res.redirect('/signup');
    }
    user.save(function(err) {
      if (err) return next(err);
      req.logIn(user, function(err) {
        if (err) return next(err);
        res.redirect('/');
      });
    });
  });
};

var initializeQuestions = function(user) {
  var questions = [
    // Failures
    { text: 'Did you look at porn yesterday?', name: 'porn', failure: true, type: "MC" },
    { text: 'Did you masterbate yesterday?', name: 'masterbate', failure: true, type: "MC" },
    { text: 'Did you cross any boundaries yesterday?', name: 'boundaries', failure: true, type: "MC" },


    // Growth
    { text: 'Did you work on memorizing yesterday?', name: 'memorize', growth: true, type: "MC" },
    { text: 'Did you read the Bible yesterday?', name: 'read', growth: true, type: "MC" },
    { text: 'Did you pray for others yesterday?', name: 'pray-others', growth: true, type: "MC" },
    { text: 'Did you ask God for help in your battle against sexual sin yesterday?',
        name: 'pray-self', growth: true, type: "MC" },

    // General
    { text: 'What was your stress level yesterday?', name: 'stress', type: "MC special",
        possibleAnswers: ['low', 'moderate', 'high'] }
  ];

  user.questions = [];

  questions.forEach(function(q) {
    q.answers = [];
    user.questions.push(q);
  });
};

/**
 * GET /account
 * Profile page.
 */
exports.getAccount = function(req, res) {
  res.render('account/profile', {
    title: 'Account Management'
  });
};

/**
 * POST /account/profile
 * Update profile information.
 */
exports.postUpdateProfile = function(req, res, next) {
  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);
    user.email = req.body.email || '';
    user.profile.name = req.body.name || '';
    user.profile.gender = req.body.gender || '';
    user.profile.location = req.body.location || '';
    user.profile.website = req.body.website || '';

    user.save(function(err) {
      if (err) return next(err);
      req.flash('success', { msg: 'Profile information updated.' });
      res.redirect('/account');
    });
  });
};

/**
 * POST /account/password
 * Update current password.
 */
exports.postUpdatePassword = function(req, res, next) {
  req.assert('password', 'Password must be at least 4 characters long').len(4);
  req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/account');
  }

  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);

    user.password = req.body.password;

    user.save(function(err) {
      if (err) return next(err);
      req.flash('success', { msg: 'Password has been changed.' });
      res.redirect('/account');
    });
  });
};

/**
 * POST /account/delete
 * Delete user account.
 */
exports.postDeleteAccount = function(req, res, next) {
  User.remove({ _id: req.user.id }, function(err) {
    if (err) return next(err);
    req.logout();
    req.flash('info', { msg: 'Your account has been deleted.' });
    res.redirect('/');
  });
};

/**
 * GET /account/unlink/:provider
 * Unlink OAuth provider.
 */
exports.getOauthUnlink = function(req, res, next) {
  var provider = req.params.provider;
  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);

    user[provider] = undefined;
    user.tokens = _.reject(user.tokens, function(token) { return token.kind === provider; });

    user.save(function(err) {
      if (err) return next(err);
      req.flash('info', { msg: provider + ' account has been unlinked.' });
      res.redirect('/account');
    });
  });
};

/**
 * GET /reset/:token
 * Reset Password page.
 */
exports.getReset = function(req, res) {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  User
    .findOne({ resetPasswordToken: req.params.token })
    .where('resetPasswordExpires').gt(Date.now())
    .exec(function(err, user) {
      if (!user) {
        req.flash('errors', { msg: 'Password reset token is invalid or has expired.' });
        return res.redirect('/forgot');
      }
      res.render('account/reset', {
        title: 'Password Reset'
      });
    });
};

/**
 * POST /reset/:token
 * Process the reset password request.
 */
exports.postReset = function(req, res, next) {
  req.assert('password', 'Password must be at least 4 characters long.').len(4);
  req.assert('confirm', 'Passwords must match.').equals(req.body.password);

  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('back');
  }

  async.waterfall([
    function(done) {
      User
        .findOne({ resetPasswordToken: req.params.token })
        .where('resetPasswordExpires').gt(Date.now())
        .exec(function(err, user) {
          if (!user) {
            req.flash('errors', { msg: 'Password reset token is invalid or has expired.' });
            return res.redirect('back');
          }

          user.password = req.body.password;
          user.resetPasswordToken = undefined;
          user.resetPasswordExpires = undefined;

          user.save(function(err) {
            if (err) return next(err);
            req.logIn(user, function(err) {
              done(err, user);
            });
          });
        });
    },
    function(user, done) {
      var transporter = nodemailer.createTransport({
        service: 'Mandrill',
        auth: {
          user: secrets.mandrill.user,
          pass: secrets.mandrill.password
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'hackathon@starter.com',
        subject: 'Your Hackathon Starter password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      transporter.sendMail(mailOptions, function(err) {
        req.flash('success', { msg: 'Success! Your password has been changed.' });
        done(err);
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/');
  });
};

/**
 * GET /forgot
 * Forgot Password page.
 */
exports.getForgot = function(req, res) {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.render('account/forgot', {
    title: 'Forgot Password'
  });
};

/**
 * POST /forgot
 * Create a random token, then the send user an email with a reset link.
 */
exports.postForgot = function(req, res, next) {
  req.assert('email', 'Please enter a valid email address.').isEmail();

  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/forgot');
  }

  async.waterfall([
    function(done) {
      crypto.randomBytes(16, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email.toLowerCase() }, function(err, user) {
        if (!user) {
          req.flash('errors', { msg: 'No account with that email address exists.' });
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var transporter = nodemailer.createTransport({
        service: 'Mandrill',
        auth: {
          user: secrets.mandrill.user,
          pass: secrets.mandrill.password
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'hackathon@starter.com',
        subject: 'Reset your password on Hackathon Starter',
        text: 'You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      transporter.sendMail(mailOptions, function(err) {
        req.flash('info', { msg: 'An e-mail has been sent to ' + user.email + ' with further instructions.' });
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
};

/**
 * GET /questions
 * Questions.
 */
exports.getQuestions = function(req, res) {
  res.render('questions', {
    title: 'Questions'
  });
};

/**
 * POST /questions
 * Display questions.
 */
exports.postQuestions = function(req, res, next) {
  req.assert('porn', 'porn cannot be blank').notEmpty();
  req.assert('masterbate', 'masterbate cannot be blank').notEmpty();
  req.assert('memorize', 'Memorize cannot be blank').notEmpty();

  var determineMajorFailure = function(question, answer) {
    if (!question.failure) return false; // only failure questions can cause major failure

    if (question.type === "MC" && answer === "yes") return true;

    return false;
  };

  var determineMinorFailure = function(question, answer) {
    // currently only applies to growth questions
    if (question.growth && question.type === "MC" && answer === "no") return true;

    return false;
  };

  var determineGrayArea = function(question, answer) {
    if (question.type === "MC" && answer.toLowerCase().indexOf("gray") > -1) return true;

    return false;
  };

  var majorFailure = false;
  var minorFailure = false;
  var grayArea = false;

  var answers = req.body;

  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);

    // get the name of an answer
    var names = Object.keys(answers);
    names.forEach(function (answerName) {
      user.questions.forEach(function (question) {
        // find matching question
        if (answerName === question.name) {
          // ensure question has answer array
          if (question.answers === false) {
            question.answers = [];
          }

          // append answer to answer array
          var answerValue = answers[answerName];

          var major = determineMajorFailure(question, answerValue);
          if (major) {
            majorFailure = true;
          }
          var minor = determineMinorFailure(question, answerValue);
          if (minor) {
            minorFailure = true;
          }
          var gray = determineGrayArea(question, answerValue);
          if (gray) {
            grayArea = true;
          }

          var obj = { date: new Date(), value: answerValue};

          question.answers.push(obj);
        }
      });
    });

    var summary = null;
    if (majorFailure) {
      summary = "Major failure.";
    } else if (minorFailure) {
      summary = "Minor failure.";
    }

    if (grayArea) {
      var grayAreaText = 'Had a gray area.';
      if (summary == null) {
        summary = grayAreaText;
      } else {
        summary += " " + grayAreaText;
      }
    }

    if (summary == null) {
      summary = "All good!";
    }


    user.save(function(err) {
      if (err) return next(err);
      req.flash('success', { msg: 'Saved answers to database' });
      res.render('answers', {
        title: 'Answers',
        answers: answers,
        summary: summary
      });
    });
  });

};