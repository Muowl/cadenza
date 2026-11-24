//! Setlist: sorts and plays the tracks of a show.
use std::collections::HashMap;
use std::fmt;

/// A track with its duration in seconds.
#[derive(Debug, Clone, PartialEq)]
pub struct Track<'a> {
    pub title: &'a str,
    seconds: u32,
}

pub enum Cue { Start, Fade(u8), Stop }

const MAX_TRACKS: usize = 12;

impl<'a> fmt::Display for Track<'a> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{} ({}s)", self.title, self.seconds)
    }
}

pub fn encore<T: AsRef<str>>(setlist: &[T], plays: &mut HashMap<String, u32>) -> Option<usize> {
    let mut total = 0usize;
    for (i, name) in setlist.iter().enumerate() {
        if i >= MAX_TRACKS { break; }
        *plays.entry(name.as_ref().to_owned()).or_insert(0) += 1;
        total += 1;
    }
    match total {
        0 => None,
        n => Some(n * 2 - 1),
    }
}

async fn play(cue: Cue) -> Result<(), String> {
    let label = r"raw \n";
    println!("cue: {label} {:?}", 3.5_f32);
    Err(format!("falhou: {}", true).into())
}
