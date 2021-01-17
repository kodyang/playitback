import React, { Component } from "react";
import './NavBar.css';

import Cookies from 'js-cookie';

import { getHostUrl } from '../../Util/Utilities';

class NavBar extends Component {
  constructor() {
    super();
    this.state = {
      hasToken: false,
      username: null
    }
  }

  componentDidMount() {
    var token = Cookies.get('spotify_auth_state');
    console.log("THE TOKEN IS: " + token);

    var hasToken = token != null;
    if (hasToken) {
      var url = new URL(getHostUrl() + 'api/spotify/username');
      console.log("attempting request");
      fetch(url, {
        credentials: "same-origin"
      })
      .then(data => data.json())
      .then(data => {
        if (data == null || data.email == null) {
          console.log("got failure")
          Cookies.remove('spotify_auth_state');
          this.setState({hasToken: false, username: null});
          return;
        }

        console.log(data);
        this.setState({hasToken: true, username: data.email});
      });
    }
  }

  render() {
    return (
      <React.Fragment>
        <nav className="navbar">
          {!this.state.hasToken ? 
            <a className="spotify-button btn nav-text" href="/api/spotify/login">
              Login with Spotify
            </a> : <div className="nav-text">{this.state.username}</div>
          }
        </nav>
      </React.Fragment>
    );
  }
}
 
export default NavBar;