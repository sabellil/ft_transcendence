import { useState } from "react";
import "./friends.scss";
import { useT } from "../../language.tsx";
import { usernameSchema, sanitizeUsername } from "../../validation.ts";
import type { PublicUser, Direction } from "../../constants.ts";
import { assetUrl } from "../../engine/api.ts";
import { getFriendList, getDirectionalFriendRequests, createFriendRequest, removeFriendRequest, acceptFriendRequest, deleteUsership } from "../../engine/friends.ts";
import { useAbortableLoad } from "../../app.tsx";

