package com.dico.scan.exception;

public class NotEnoughTokensException extends RuntimeException {
    public NotEnoughTokensException(String message) {
        super(message);
    }
}
