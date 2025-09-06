import mongoose from "mongoose";
import passport from "passport";
import passportJWT from "passport-jwt";

import { env } from "../config/env.config.js";

const JWTStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;

const User = mongoose.model("User");

passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
      secretOrKey: env.APP_SECRET,
    },
    (jwtPayload, cb) =>
      User.findById(String(jwtPayload.user_id))
        .then((user) => {
          cb(null, user ? user : {});
        })
        .catch((err) => {
          cb(err);
        })
  )
);
